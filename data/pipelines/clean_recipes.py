"""Build one-portion recipe ingredient weight estimates.

The cleaned recipe catalogue only stores ingredient names, not original
amounts. This pipeline therefore creates an honest, price-ready estimate:

- one row per recipe ingredient
- grams per one portion
- ingredient calories scaled toward the recipe's calorie value
- confidence/source columns so the app can label estimates appropriately

Use these grams with real receipt prices at runtime:
    meal_cost = SUM(grams_per_portion * receipt_price_per_gram)
"""

from __future__ import annotations

import argparse
import csv
import math
import re
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from modules.nutrition.classifier import classify  # noqa: E402


DEFAULT_RECIPES = BACKEND_DIR / "data" / "processed" / "recipes_clean.csv"
DEFAULT_FOOD_REFERENCE = BACKEND_DIR / "data" / "processed" / "food_reference.csv"
DEFAULT_INGREDIENTS_OUT = (
    BACKEND_DIR / "data" / "processed" / "recipe_portion_ingredients.csv"
)
DEFAULT_SUMMARY_OUT = (
    BACKEND_DIR / "data" / "processed" / "recipe_portion_summary.csv"
)

INGREDIENT_FIELDS = [
    "recipe_id",
    "recipe_name",
    "ingredient_position",
    "ingredient_name",
    "matched_food_name",
    "canonical_name",
    "category",
    "grams_per_portion",
    "kcal_per_100g",
    "kcal_per_portion",
    "nutrition_source",
    "gram_basis",
    "calorie_scale_factor",
    "weight_confidence",
    "price_lookup_key",
]

SUMMARY_FIELDS = [
    "recipe_id",
    "recipe_name",
    "calories_per_portion",
    "total_grams_per_portion",
    "estimated_kcal_from_weights",
    "ingredient_count",
    "ingredients_with_food_reference",
    "ingredients_with_category_default",
    "calorie_scale_factor",
    "scale_was_clipped",
    "portion_basis",
    "serving_hint",
    "weight_confidence",
]

DEFAULT_KCAL_PER_100G = {
    "protein": 180.0,
    "grains": 250.0,
    "vegetables": 35.0,
    "fruits": 60.0,
    "fats": 750.0,
    "beverages": 30.0,
    "other": 100.0,
}

DEFAULT_GRAMS = {
    "protein": 100.0,
    "grains": 70.0,
    "vegetables": 80.0,
    "fruits": 100.0,
    "fats": 12.0,
    "beverages": 120.0,
    "other": 25.0,
}

DESCRIPTOR_WORDS = {
    "fresh",
    "frozen",
    "canned",
    "cooked",
    "uncooked",
    "raw",
    "dried",
    "dry",
    "chopped",
    "sliced",
    "diced",
    "crushed",
    "minced",
    "ground",
    "boneless",
    "skinless",
    "large",
    "small",
    "medium",
    "low",
    "fat",
    "free",
    "all",
    "purpose",
}

GRAM_OVERRIDES = [
    (r"\b(salt)\b", 1.0, "minor_seasoning", True),
    (r"\b(pepper|black pepper|white pepper)\b", 0.5, "minor_seasoning", True),
    (r"\b(cumin|paprika|cinnamon|nutmeg|clove|cloves|turmeric|coriander|oregano|thyme|rosemary|sage|dill|basil|parsley|cilantro|mint|seasoning|spice|powder)\b", 2.0, "minor_spice_or_herb", True),
    (r"\b(vanilla extract|extract|baking powder|baking soda|yeast)\b", 4.0, "minor_baking_agent", True),
    (r"\b(garlic clove|garlic cloves)\b", 5.0, "default_garlic_clove", False),
    (r"\b(egg|eggs|egg white|egg whites)\b", 50.0, "default_egg", False),
    (r"\b(oil|olive oil|sesame oil|vegetable oil|canola oil)\b", 7.0, "default_oil", False),
    (r"\b(butter|ghee|margarine|lard)\b", 7.0, "default_solid_fat", False),
    (r"\b(cheese|cheddar|mozzarella|parmesan|gruyere|feta|ricotta)\b", 25.0, "default_cheese", False),
    (r"\b(milk|cream|yogurt|yoghurt|buttermilk)\b", 60.0, "default_dairy_liquid", False),
    (r"\b(water|broth|stock)\b", 150.0, "default_liquid", False),
    (r"\b(flour|sugar|breadcrumbs|bread crumbs)\b", 30.0, "default_baking_dry", False),
    (r"\b(rice|pasta|noodle|noodles|quinoa|couscous|oats)\b", 65.0, "default_dry_grain", False),
]

SERVING_PATTERNS = [
    re.compile(r"\bserves?\s+(\d{1,3})\b"),
    re.compile(r"\bservings?\s*[:=]?\s*(\d{1,3})\b"),
    re.compile(r"\bmakes?\s+(\d{1,3})\b"),
    re.compile(r"\byields?\s+(\d{1,3})\b"),
]


def normalise_name(value):
    value = str(value or "").lower().strip()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def singularise_token(token):
    if token.endswith("ies") and len(token) > 3:
        return token[:-3] + "y"
    if token.endswith("oes") and len(token) > 3:
        return token[:-2]
    if token.endswith("es") and len(token) > 3:
        return token[:-2]
    if token.endswith("s") and len(token) > 2:
        return token[:-1]
    return token


def singularise_name(value):
    return " ".join(singularise_token(token) for token in normalise_name(value).split())


def strip_descriptors(value):
    tokens = [
        token for token in normalise_name(value).split()
        if token not in DESCRIPTOR_WORDS
    ]
    return " ".join(tokens)


def parse_float(value):
    try:
        if value in (None, ""):
            return None
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(parsed):
        return None
    return parsed


def round_float(value, digits=3):
    if value is None:
        return ""
    return round(float(value), digits)


def choose_reference(existing_entry, candidate_entry):
    candidate_priority, candidate = candidate_entry
    if existing_entry is None:
        return candidate_entry
    existing_priority, existing = existing_entry
    if candidate_priority != existing_priority:
        return candidate_entry if candidate_priority > existing_priority else existing_entry

    if existing is None:
        return candidate_entry
    existing_has_energy = parse_float(existing.get("energy_kcal")) is not None
    candidate_has_energy = parse_float(candidate.get("energy_kcal")) is not None
    if candidate_has_energy and not existing_has_energy:
        return candidate_entry
    candidate_score = parse_float(candidate.get("afcd_match_score")) or 0.0
    existing_score = parse_float(existing.get("afcd_match_score")) or 0.0
    if candidate_score > existing_score:
        return candidate_entry
    return existing_entry


def read_food_reference(path):
    index = {}
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            ingredient = row.get("ingredient_name", "")
            canonical = row.get("canonical_name", "")
            keys_with_priority = [
                (normalise_name(ingredient), 4),
                (singularise_name(ingredient), 3),
                (normalise_name(canonical), 2),
                (singularise_name(canonical), 1),
            ]
            for key, priority in keys_with_priority:
                if key:
                    index[key] = choose_reference(index.get(key), (priority, row))
    return index


def reference_candidates(ingredient_name):
    base = normalise_name(ingredient_name)
    stripped = strip_descriptors(base)
    candidates = [
        base,
        singularise_name(base),
        stripped,
        singularise_name(stripped),
    ]
    seen = set()
    for candidate in candidates:
        if candidate and candidate not in seen:
            seen.add(candidate)
            yield candidate


def match_food_reference(ingredient_name, reference_index):
    for candidate in reference_candidates(ingredient_name):
        entry = reference_index.get(candidate)
        if entry:
            return entry[1] if isinstance(entry, tuple) else entry
    return None


def serving_hint(steps):
    text = normalise_name(steps)
    for pattern in SERVING_PATTERNS:
        match = pattern.search(text)
        if match:
            return match.group(1)
    return ""


def default_grams_for(ingredient_name, category):
    normalised = normalise_name(ingredient_name)
    for pattern, grams, basis, fixed in GRAM_OVERRIDES:
        if re.search(pattern, normalised):
            return grams, basis, fixed
    return DEFAULT_GRAMS.get(category, DEFAULT_GRAMS["other"]), f"default_{category}", False


def kcal_override(ingredient_name, gram_basis, kcal_per_100g):
    normalised = normalise_name(ingredient_name)
    if gram_basis == "minor_seasoning" and re.search(r"\bsalt\b", normalised):
        return 0.0
    if gram_basis == "default_liquid" and re.search(r"\bwater\b", normalised):
        return 0.0
    return kcal_per_100g


def ingredient_confidence(has_reference, scale_was_clipped, target_calories):
    if target_calories is None:
        return "low"
    if scale_was_clipped:
        return "low"
    if has_reference:
        return "medium"
    return "low"


def summary_confidence(reference_count, ingredient_count, scale_was_clipped, target_calories):
    if ingredient_count == 0 or target_calories is None or scale_was_clipped:
        return "low"
    coverage = reference_count / ingredient_count
    if coverage >= 0.8:
        return "medium"
    if coverage >= 0.5:
        return "medium_low"
    return "low"


def build_recipe_portion(recipe_row, reference_index, min_scale=0.1, max_scale=6.0):
    recipe_id = str(recipe_row.get("id", "")).strip()
    recipe_name = str(recipe_row.get("name", "")).strip()
    ingredients = [
        item.strip()
        for item in str(recipe_row.get("ingredients_clean") or "").split("|")
        if item.strip()
    ]
    target_calories = parse_float(recipe_row.get("calories"))

    detail_rows = []
    reference_count = 0
    default_count = 0

    for position, ingredient in enumerate(ingredients, start=1):
        ref = match_food_reference(ingredient, reference_index)
        category = classify(ingredient)
        has_reference_energy = ref is not None and parse_float(ref.get("energy_kcal")) is not None
        kcal_per_100g = (
            parse_float(ref.get("energy_kcal"))
            if has_reference_energy else
            DEFAULT_KCAL_PER_100G.get(category, DEFAULT_KCAL_PER_100G["other"])
        )
        grams, gram_basis, fixed_grams = default_grams_for(ingredient, category)
        kcal_per_100g = kcal_override(ingredient, gram_basis, kcal_per_100g)

        if has_reference_energy:
            reference_count += 1
            nutrition_source = "food_reference"
        else:
            default_count += 1
            nutrition_source = "category_default"

        detail_rows.append({
            "recipe_id": recipe_id,
            "recipe_name": recipe_name,
            "ingredient_position": position,
            "ingredient_name": ingredient,
            "matched_food_name": ref.get("ingredient_name", "") if ref else "",
            "canonical_name": ref.get("canonical_name", "") if ref else "",
            "category": category,
            "base_grams": grams,
            "kcal_per_100g": kcal_per_100g,
            "nutrition_source": nutrition_source,
            "gram_basis": gram_basis,
            "fixed_grams": fixed_grams,
            "price_lookup_key": normalise_name(
                ref.get("ingredient_name", ingredient) if ref else ingredient
            ),
        })

    fixed_kcal = sum(
        row["base_grams"] * row["kcal_per_100g"] / 100.0
        for row in detail_rows
        if row["fixed_grams"]
    )
    variable_kcal = sum(
        row["base_grams"] * row["kcal_per_100g"] / 100.0
        for row in detail_rows
        if not row["fixed_grams"]
    )

    scale = 1.0
    scale_was_clipped = False
    if target_calories and target_calories > 0 and variable_kcal > 0:
        raw_scale = (target_calories - fixed_kcal) / variable_kcal
        if raw_scale <= 0:
            raw_scale = target_calories / (fixed_kcal + variable_kcal)
        scale = max(min_scale, min(max_scale, raw_scale))
        scale_was_clipped = scale != raw_scale

    output_details = []
    for row in detail_rows:
        grams = row["base_grams"] if row["fixed_grams"] else row["base_grams"] * scale
        kcal = grams * row["kcal_per_100g"] / 100.0
        has_reference = row["nutrition_source"] == "food_reference"
        confidence = ingredient_confidence(has_reference, scale_was_clipped, target_calories)
        output_details.append({
            "recipe_id": row["recipe_id"],
            "recipe_name": row["recipe_name"],
            "ingredient_position": row["ingredient_position"],
            "ingredient_name": row["ingredient_name"],
            "matched_food_name": row["matched_food_name"],
            "canonical_name": row["canonical_name"],
            "category": row["category"],
            "grams_per_portion": round_float(grams, 2),
            "kcal_per_100g": round_float(row["kcal_per_100g"], 2),
            "kcal_per_portion": round_float(kcal, 2),
            "nutrition_source": row["nutrition_source"],
            "gram_basis": row["gram_basis"],
            "calorie_scale_factor": round_float(scale, 4),
            "weight_confidence": confidence,
            "price_lookup_key": row["price_lookup_key"],
        })

    total_grams = sum(float(row["grams_per_portion"]) for row in output_details)
    total_kcal = sum(float(row["kcal_per_portion"]) for row in output_details)
    summary = {
        "recipe_id": recipe_id,
        "recipe_name": recipe_name,
        "calories_per_portion": round_float(target_calories, 2),
        "total_grams_per_portion": round_float(total_grams, 2),
        "estimated_kcal_from_weights": round_float(total_kcal, 2),
        "ingredient_count": len(ingredients),
        "ingredients_with_food_reference": reference_count,
        "ingredients_with_category_default": default_count,
        "calorie_scale_factor": round_float(scale, 4),
        "scale_was_clipped": scale_was_clipped,
        "portion_basis": "estimated_one_portion_scaled_to_recipe_calories",
        "serving_hint": serving_hint(recipe_row.get("steps_clean") or ""),
        "weight_confidence": summary_confidence(
            reference_count,
            len(ingredients),
            scale_was_clipped,
            target_calories,
        ),
    }
    return summary, output_details


def build_outputs(
    recipes_path,
    food_reference_path,
    ingredients_out,
    summary_out,
    limit=None,
    progress_every=25000,
    min_scale=0.1,
    max_scale=6.0,
):
    csv.field_size_limit(10_000_000)
    reference_index = read_food_reference(food_reference_path)
    ingredients_out.parent.mkdir(parents=True, exist_ok=True)
    summary_out.parent.mkdir(parents=True, exist_ok=True)

    recipe_count = 0
    ingredient_count = 0

    with (
        recipes_path.open(newline="", encoding="utf-8") as recipes_handle,
        ingredients_out.open("w", newline="", encoding="utf-8") as ingredients_handle,
        summary_out.open("w", newline="", encoding="utf-8") as summary_handle,
    ):
        reader = csv.DictReader(recipes_handle)
        ingredient_writer = csv.DictWriter(ingredients_handle, fieldnames=INGREDIENT_FIELDS)
        summary_writer = csv.DictWriter(summary_handle, fieldnames=SUMMARY_FIELDS)
        ingredient_writer.writeheader()
        summary_writer.writeheader()

        for recipe_row in reader:
            if limit is not None and recipe_count >= limit:
                break
            if not recipe_row.get("id") or not recipe_row.get("ingredients_clean"):
                continue

            summary, details = build_recipe_portion(
                recipe_row,
                reference_index,
                min_scale=min_scale,
                max_scale=max_scale,
            )
            summary_writer.writerow(summary)
            ingredient_writer.writerows(details)

            recipe_count += 1
            ingredient_count += len(details)
            if progress_every and recipe_count % progress_every == 0:
                print(f"processed recipes: {recipe_count:,}")

    return recipe_count, ingredient_count


def parse_args():
    parser = argparse.ArgumentParser(
        description="Create one-portion recipe gram estimates for meal costing."
    )
    parser.add_argument("--recipes", type=Path, default=DEFAULT_RECIPES)
    parser.add_argument("--food-reference", type=Path, default=DEFAULT_FOOD_REFERENCE)
    parser.add_argument("--ingredients-out", type=Path, default=DEFAULT_INGREDIENTS_OUT)
    parser.add_argument("--summary-out", type=Path, default=DEFAULT_SUMMARY_OUT)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--progress-every", type=int, default=25000)
    parser.add_argument("--min-scale", type=float, default=0.1)
    parser.add_argument("--max-scale", type=float, default=6.0)
    return parser.parse_args()


def main():
    args = parse_args()
    recipe_count, ingredient_count = build_outputs(
        recipes_path=args.recipes,
        food_reference_path=args.food_reference,
        ingredients_out=args.ingredients_out,
        summary_out=args.summary_out,
        limit=args.limit,
        progress_every=args.progress_every,
        min_scale=args.min_scale,
        max_scale=args.max_scale,
    )
    print(f"recipe_portion_summary.csv: {recipe_count:,}")
    print(f"recipe_portion_ingredients.csv: {ingredient_count:,}")
    print(f"Wrote: {args.summary_out}")
    print(f"Wrote: {args.ingredients_out}")


if __name__ == "__main__":
    main()
