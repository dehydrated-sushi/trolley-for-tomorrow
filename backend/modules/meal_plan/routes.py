from datetime import date
import re

from flask import Blueprint, abort, jsonify, request, send_from_directory
from core.database import db
from sqlalchemy import text

from modules.meal_plan.image_service import (
    IMAGE_DIR,
    fetch_and_cache,
    get_cached_image,
)
from modules.nutrition.classifier import classify
from modules.nutrition.dietary import (
    is_recipe_allowed,
    sql_exclude_clause,
    PREFERENCES,
)
from modules.profile.routes import _active_preferences
from modules.receipt.expiry_reference import estimate_expiry_date
from modules.receipt.service import ensure_receipt_session_schema, normalise_expiry_date

bp = Blueprint("meal_plan_bp", __name__, url_prefix="/api/meals")

SKIP_ITEMS = frozenset({
    "water", "ice", "salt", "pepper", "sugar", "oil", "butter",
})

MIN_ITEM_LENGTH = 3

MATCH_STOPWORDS = frozenset({
    "and", "the", "with", "fresh", "organic", "australian", "australia",
    "woolworths", "coles", "aldi", "ww", "rspca", "brand", "pack", "packs",
    "each", "large", "small", "medium", "price", "promotional",
})

# Minimum share of recipe ingredients that must be in the user's fridge
# before the recipe appears in recommendations. Stops the list from
# filling up with 3-of-15 partial matches. Overridden when strict_only=true
# (which requires 100%).
MIN_MATCH_RATIO = 0.4

# Ignore implausible receipt-derived unit prices. OCR often stores pack counts
# as "1"; treating that as 1g turns a normal pack into thousands per recipe.
MAX_PRICE_PER_GRAM = 0.30

# Valid sort keys accepted by the `sort` query param.
SORT_KEYS = frozenset({
    "expiry", "match", "highest_protein", "lowest_calories", "highest_calories",
})


# ==========================================================================
# Tag definitions.
# Each tag is derived from REAL columns in the `recipes` table with
# documented thresholds. No invented data.
# ==========================================================================
TAG_DEFINITIONS = {
    "drink": {
        "label": "Drink",
        "description": "Beverage-dominant recipe (classifier).",
        "source": "classifier.dominant_category = 'beverages'",
    },
    "high_protein": {
        "label": "High protein",
        "description": "Protein ≥ 25g per serving.",
        "source": "recipes.protein >= 25",
    },
    "low_carb": {
        "label": "Low carb",
        "description": "Carbohydrates < 20g per serving.",
        "source": "recipes.carbohydrates < 20",
    },
    "light": {
        "label": "Light",
        "description": "Under 300 calories per serving.",
        "source": "recipes.calories < 300",
    },
    "hearty": {
        "label": "Hearty",
        "description": "600+ calories per serving.",
        "source": "recipes.calories >= 600",
    },
    "quick": {
        "label": "Quick",
        "description": "Ready in 15 minutes or less.",
        "source": "recipes.minutes <= 15",
    },
    "sweet": {
        "label": "Sweet",
        "description": "Sugar > 25g per serving (proxy for dessert).",
        "source": "recipes.sugar > 25",
    },
    "simple": {
        "label": "Simple",
        "description": "5 ingredients or fewer.",
        "source": "recipes.n_ingredients <= 5",
    },
}
TAG_KEYS = set(TAG_DEFINITIONS.keys())


def _dominant_category(ingredients_with_cat):
    """Return category key appearing most often, ignoring 'other'."""
    counts = {}
    for ing in ingredients_with_cat:
        c = ing["category"]
        if c and c != "other":
            counts[c] = counts.get(c, 0) + 1
    if not counts:
        return "other"
    return max(counts.items(), key=lambda kv: kv[1])[0]


def _compute_tags(recipe_row, ingredients_with_cat):
    """Derive tag list for a recipe from its actual column values."""
    tags = []

    protein = recipe_row.get("protein")
    if protein is not None and protein >= 25:
        tags.append("high_protein")

    carbs = recipe_row.get("carbohydrates")
    if carbs is not None and carbs < 20:
        tags.append("low_carb")

    cal = recipe_row.get("calories")
    if cal is not None:
        if cal < 300:
            tags.append("light")
        elif cal >= 600:
            tags.append("hearty")

    minutes = recipe_row.get("minutes")
    if minutes is not None and minutes > 0 and minutes <= 15:
        tags.append("quick")

    sugar = recipe_row.get("sugar")
    if sugar is not None and sugar > 25:
        tags.append("sweet")

    n_ing = recipe_row.get("n_ingredients")
    if n_ing is not None and n_ing > 0 and n_ing <= 5:
        tags.append("simple")

    dom = _dominant_category(ingredients_with_cat)
    if dom == "beverages":
        tags.append("drink")

    return tags


# ==========================================================================
def normalize(value):
    return str(value).strip().lower()


def word_match(needle, haystack):
    pos = haystack.find(needle)
    while pos != -1:
        left_ok = (pos == 0) or (not haystack[pos - 1].isalpha())
        end = pos + len(needle)
        right_ok = (end == len(haystack)) or (not haystack[end].isalpha())
        if left_ok and right_ok:
            return True
        pos = haystack.find(needle, pos + 1)
    return False


def _tokens(value):
    return [
        token
        for token in "".join(ch if ch.isalnum() else " " for ch in normalize(value)).split()
        if len(token) >= MIN_ITEM_LENGTH and token not in MATCH_STOPWORDS
    ]


def _match_candidates(item):
    """Build precise searchable terms from a fridge item.

    Receipt names often include brands and pack words. The OCR flow stores the
    real product name for display and `matched_name` for recipe logic; this
    helper is the fallback for older/manual rows without a matched name.
    """
    toks = _tokens(item)
    candidates = {item}
    candidates.update(toks)
    candidates.update(
        f"{toks[i]} {toks[i + 1]}"
        for i in range(len(toks) - 1)
    )
    return {
        c for c in candidates
        if len(c) >= MIN_ITEM_LENGTH and c not in SKIP_ITEMS
    }


def find_matching_item(recipe_ingredient, available_set):
    """Return the fridge-item name that matches, or None."""
    ri = recipe_ingredient.strip().lower()
    if not ri:
        return None
    available_items = list(available_set)
    for item in available_items:
        if ri == item:
            return item

    ri_tokens = set(_tokens(ri))
    for item in available_items:
        if word_match(item, ri) or word_match(ri, item):
            return item

    for item in available_items:
        item_tokens = set(_tokens(item))
        if not ri_tokens or not item_tokens:
            continue
        overlap = ri_tokens & item_tokens
        if len(overlap) >= 2:
            return item
        if len(ri_tokens) == 1 and ri_tokens <= item_tokens:
            return item
    return None


def _parse_bool(raw, default=False):
    if raw is None:
        return default
    return str(raw).strip().lower() in ("1", "true", "yes", "on")


def _parse_int(raw, default, minimum=1, maximum=None):
    if raw is None or raw == "":
        return default
    try:
        v = int(raw)
    except (TypeError, ValueError):
        return default
    if v < minimum:
        v = minimum
    if maximum is not None and v > maximum:
        v = maximum
    return v


def _date_from_value(value):
    if not value:
        return None
    if hasattr(value, "date"):
        return value.date()
    try:
        return normalise_expiry_date(str(value)[:10])
    except ValueError:
        return None


def _days_until(expiry_date):
    if expiry_date is None:
        return None
    return (expiry_date - date.today()).days


def _expiry_sort_value(recipe):
    days = recipe.get("earliest_expiry_days")
    return days if days is not None else 10**9


def _normalise_lookup(value):
    return " ".join(str(value or "").strip().lower().split())


def _unit_amount_to_grams(amount, unit):
    unit = unit.lower()
    if unit in {"g", "gram", "grams"}:
        return amount
    if unit in {"kg", "kilogram", "kilograms"}:
        return amount * 1000
    if unit in {"ml", "millilitre", "millilitres", "milliliter", "milliliters"}:
        return amount
    if unit in {"l", "lt", "liter", "liters", "litre", "litres"}:
        return amount * 1000
    return None


def _qty_to_grams(value):
    if value in (None, ""):
        return None

    text_value = str(value).strip().lower().replace(",", ".")
    pack_match = re.search(
        r"(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)\s*([a-z]+)",
        text_value,
    )
    if pack_match:
        count = float(pack_match.group(1))
        amount = float(pack_match.group(2))
        grams = _unit_amount_to_grams(amount, pack_match.group(3))
        if grams is not None:
            return count * grams

    for match in re.finditer(r"(\d+(?:\.\d+)?)\s*([a-z]+)", text_value):
        grams = _unit_amount_to_grams(float(match.group(1)), match.group(2))
        if grams is not None:
            return grams
    return None


def _recipe_portion_lookup(recipe_ids):
    if not recipe_ids:
        return {}

    ids = sorted({int(recipe_id) for recipe_id in recipe_ids})
    placeholders = []
    params = {}
    for index, recipe_id in enumerate(ids):
        key = f"rp{index}"
        placeholders.append(f":{key}")
        params[key] = recipe_id

    try:
        rows = db.session.execute(text(f"""
            SELECT
                recipe_id,
                ingredient_name,
                price_lookup_key,
                grams_per_portion,
                weight_confidence
            FROM recipe_portion_ingredients
            WHERE recipe_id IN ({', '.join(placeholders)})
        """), params).fetchall()
    except Exception:
        db.session.rollback()
        return {}

    lookup = {}
    for row in rows:
        m = row._mapping
        recipe_id = m["recipe_id"]
        grams = m["grams_per_portion"]
        if grams is None:
            continue
        detail = {
            "grams_per_portion": float(grams),
            "weight_confidence": m["weight_confidence"],
        }
        for key_value in (m["price_lookup_key"], m["ingredient_name"]):
            key = _normalise_lookup(key_value)
            if key:
                lookup[(recipe_id, key)] = detail
    return lookup


@bp.route("/tags", methods=["GET"])
def get_tags():
    """Return the list of available tags + their descriptions (for the filter UI)."""
    return jsonify({"tags": TAG_DEFINITIONS}), 200


@bp.route("/recipe/<int:recipe_id>", methods=["GET"])
def get_recipe(recipe_id):
    """Fetch a single recipe by id, for the search-result detail modal and
    any other surface that needs a full record without going through the
    recommendations pipeline.

    Returns ingredients + steps pre-split the same way the recommendations
    and favourites endpoints do, so one client-side renderer can consume
    any of the three shapes.
    """
    row = db.session.execute(text("""
        SELECT r.id, r.name,
               r.ingredients_clean, r.steps_clean,
               r.calories, r.protein, r.carbohydrates, r.sugar,
               r.total_fat, r.saturated_fat, r.sodium,
               r.minutes, r.n_ingredients
        FROM recipes r
        WHERE r.id = :rid
    """), {"rid": recipe_id}).fetchone()

    if row is None:
        return jsonify({"error": "Recipe not found"}), 404

    m = dict(row._mapping)
    m["ingredients"] = [
        i.strip() for i in (m.pop("ingredients_clean") or "").split("|") if i.strip()
    ]
    m["steps"] = [
        s.strip() for s in (m.pop("steps_clean") or "").split("|") if s.strip()
    ]
    return jsonify({"recipe": m}), 200


@bp.route("/search", methods=["GET"])
def search_recipes():
    """Typeahead recipe search for the TopNav search bar.

    - `q`: query string. < 2 chars returns [] (too noisy).
    - `limit`: row cap, default 8, maxed at 20.

    Ranking: prefix matches first (so typing "coco" surfaces "coconut curry"
    before "chocolate coconut cake"), then other substring matches. Within
    each tier, sort alphabetical on name for stable output.

    Returns a compact shape. Clients fetch full records via the existing
    recommendations / favourites endpoints if they need more than a name
    and an id to land on the right recipe card.
    """
    q = (request.args.get("q") or "").strip()
    if len(q) < 2:
        return jsonify({"query": q, "results": []}), 200

    try:
        limit = int(request.args.get("limit", 8))
    except (TypeError, ValueError):
        limit = 8
    limit = max(1, min(limit, 20))

    like_any = f"%{q}%"
    like_prefix = f"{q}%"

    rows = db.session.execute(text("""
        SELECT
            id,
            name,
            calories,
            minutes,
            CASE
                WHEN LOWER(name) LIKE LOWER(:prefix) THEN 1
                ELSE 2
            END AS match_rank
        FROM recipes
        WHERE LOWER(name) LIKE LOWER(:any)
        ORDER BY match_rank ASC, LOWER(name) ASC
        LIMIT :lim
    """), {"any": like_any, "prefix": like_prefix, "lim": limit}).fetchall()

    results = [
        {
            "id":         r._mapping["id"],
            "name":       r._mapping["name"],
            "calories":   r._mapping["calories"],
            "minutes":    r._mapping["minutes"],
            "match_type": "prefix" if r._mapping["match_rank"] == 1 else "contains",
        }
        for r in rows
    ]

    return jsonify({"query": q, "results": results}), 200


@bp.route("/recipe-image/<int:recipe_id>", methods=["GET"])
def get_recipe_image(recipe_id):
    """Serve a cached Pixabay photo for a recipe.

    404 means "no image" — either Pixabay had no hit (persisted negative) or
    the cache hasn't been populated and the feature is disabled (no
    PIXABAY_API_KEY). The frontend treats 404 as "render the gradient +
    category-icon hero" and never shows a broken-image placeholder.
    """
    cached = get_cached_image(recipe_id)
    if cached is None:
        row = db.session.execute(
            text("SELECT name FROM recipes WHERE id = :rid"),
            {"rid": recipe_id},
        ).fetchone()
        if row is None:
            abort(404)
        cached = fetch_and_cache(recipe_id, row._mapping["name"])
        if cached is None:
            # No API key configured, or cache write failed — no write happened,
            # so next request will re-attempt. Respond 404 for this one.
            abort(404)

    filename = cached.get("image_filename")
    if not filename:
        abort(404)
    return send_from_directory(IMAGE_DIR.resolve(), filename)


@bp.route("/recommendations", methods=["GET"])
def get_meal_recommendations():
    try:
        ensure_receipt_session_schema()
        # ---- query params ----
        raw_max = request.args.get("max_cost")
        max_cost = None
        if raw_max is not None and raw_max != "":
            try:
                max_cost = float(raw_max)
            except ValueError:
                return jsonify({"error": "max_cost must be a number"}), 400

        strict_only = _parse_bool(request.args.get("strict_only"), default=False)
        hide_drinks = _parse_bool(request.args.get("hide_drinks"), default=False)

        # Sort order — default "expiry" so recipes using soon-expiring fridge
        # items surface first.
        sort_key = (request.args.get("sort") or "expiry").strip().lower()
        if sort_key not in SORT_KEYS:
            sort_key = "expiry"

        # Tags filter — recipe must have ALL selected tags
        raw_tags = request.args.get("tags", "")
        selected_tags = [t.strip() for t in raw_tags.split(",") if t.strip() and t.strip() in TAG_KEYS]

        page = _parse_int(request.args.get("page"), default=1, minimum=1)
        per_page = _parse_int(request.args.get("per_page"), default=20, minimum=1, maximum=100)

        diet_override = request.args.get("diet")
        if diet_override is not None:
            active_prefs = [p.strip() for p in diet_override.split(",") if p.strip() in PREFERENCES]
        else:
            active_prefs = _active_preferences()

        # ---- fridge items + price lookup ----
        rows = db.session.execute(text("""
            SELECT
                id,
                name,
                matched_name,
                LOWER(TRIM(COALESCE(NULLIF(matched_name, ''), name))) AS match_name,
                qty,
                price,
                expiry_date,
                created_at
            FROM receipt_items
            WHERE COALESCE(NULLIF(matched_name, ''), name) IS NOT NULL
              AND TRIM(COALESCE(NULLIF(matched_name, ''), name)) != ''
        """)).fetchall()

        all_items = set()
        price_values = {}
        price_per_gram_values = {}
        expiry_map = {}
        receipt_item_id_map = {}
        for r in rows:
            row = r._mapping
            name = row["match_name"]
            all_items.add(name)
            if name not in receipt_item_id_map:
                receipt_item_id_map[name] = row["id"]

            price = row["price"]
            if price is not None:
                price_values.setdefault(name, []).append(float(price))
                grams = _qty_to_grams(row["qty"])
                if grams and grams > 0:
                    price_per_gram = float(price) / grams
                    if 0 < price_per_gram <= MAX_PRICE_PER_GRAM:
                        price_per_gram_values.setdefault(name, []).append(price_per_gram)

            expiry_date = row["expiry_date"]
            if expiry_date is None:
                expiry_date = estimate_expiry_date(
                    row["name"] or "",
                    matched_name=row["matched_name"],
                    today=_date_from_value(row["created_at"]),
                )
            else:
                expiry_date = _date_from_value(expiry_date)

            if expiry_date and (name not in expiry_map or expiry_date < expiry_map[name]):
                expiry_map[name] = expiry_date

        price_map = {
            name: sum(values) / len(values)
            for name, values in price_values.items()
            if values
        }
        price_per_gram_map = {
            name: sum(values) / len(values)
            for name, values in price_per_gram_values.items()
            if values
        }

        base_response = {
            "available_items": [],
            "recommendations": [],
            "total": 0,
            "page": page,
            "per_page": per_page,
            "total_pages": 0,
            "max_cost": max_cost,
            "strict_only": strict_only,
            "hide_drinks": hide_drinks,
            "selected_tags": selected_tags,
            "active_preferences": active_prefs,
            "sort": sort_key,
            "strict_count": 0,
            "one_missing_count": 0,
        }

        if not all_items:
            return jsonify(base_response), 200

        match_items = {
            item for item in all_items
            if item not in SKIP_ITEMS and len(item) >= MIN_ITEM_LENGTH
        }
        match_items = sorted(
            match_items,
            key=lambda item: (
                _days_until(expiry_map.get(item))
                if _days_until(expiry_map.get(item)) is not None
                else 10**9,
                item,
            ),
        )

        available_with_cat = [
            {
                "name": n,
                "category": classify(n),
                "expiry_date": expiry_map[n].isoformat() if n in expiry_map else None,
                "days_until_expiry": _days_until(expiry_map.get(n)),
            }
            for n in sorted(list(all_items))
        ]
        base_response["available_items"] = available_with_cat

        if not match_items:
            return jsonify(base_response), 200

        # ---- SQL pre-filter: recipes that mention at least one fridge item ----
        search_terms = sorted({
            candidate
            for item in match_items
            for candidate in _match_candidates(item)
        })
        like_clauses = []
        params = {}
        for i, item in enumerate(search_terms):
            p = f"i{i}"
            like_clauses.append(f"LOWER(ingredients_clean) LIKE :{p}")
            params[p] = f"%{item}%"
        where_sql = " OR ".join(like_clauses)

        diet_sql, diet_params = sql_exclude_clause(active_prefs, param_prefix="d")
        if diet_sql:
            where_sql = f"({where_sql}) AND ({diet_sql})"
            params.update(diet_params)

        recipe_rows = db.session.execute(text(
            f"SELECT id, name, ingredients_clean, steps_clean, "
            f"       calories, protein, carbohydrates, sugar, "
            f"       total_fat, saturated_fat, sodium, "
            f"       minutes, n_ingredients "
            f"FROM recipes "
            f"WHERE ingredients_clean IS NOT NULL AND ({where_sql}) "
            f"LIMIT 8000"
        ), params).fetchall()
        portion_lookup = _recipe_portion_lookup([row._mapping["id"] for row in recipe_rows])

        # ---- Fine-grained scoring + tag computation ----
        all_recipes = []

        for row in recipe_rows:
            m = dict(row._mapping)
            ingredients_raw = m["ingredients_clean"] or ""
            ingredients = [i.strip() for i in ingredients_raw.split("|") if i.strip()]
            if not ingredients:
                continue

            matched = []
            matched_details = []
            cost = 0.0
            cost_source = "unavailable"
            costed_grams = 0.0
            costed_ingredient_count = 0
            uncosted_ingredient_count = 0
            pack_price_total = 0.0
            for ing in ingredients:
                fridge_item = find_matching_item(ing, match_items)
                if fridge_item:
                    matched.append(ing)
                    portion_detail = (
                        portion_lookup.get((m["id"], _normalise_lookup(fridge_item)))
                        or portion_lookup.get((m["id"], _normalise_lookup(ing)))
                    )
                    grams_per_portion = (
                        portion_detail["grams_per_portion"]
                        if portion_detail else None
                    )
                    ingredient_cost = None
                    price_per_gram = price_per_gram_map.get(fridge_item)
                    pack_price = price_map.get(fridge_item)
                    cost_status = "missing_price_data"
                    if grams_per_portion is not None and price_per_gram is not None:
                        ingredient_cost = grams_per_portion * price_per_gram
                        cost += ingredient_cost
                        costed_grams += grams_per_portion
                        costed_ingredient_count += 1
                        cost_source = "grams_x_receipt_price_per_gram"
                    else:
                        uncosted_ingredient_count += 1
                        if pack_price is not None:
                            pack_price_total += pack_price
                        if not portion_detail:
                            cost_status = "missing_recipe_grams"
                        elif price_per_gram is None:
                            cost_status = "missing_receipt_weight"
                    expiry_date = expiry_map.get(fridge_item)
                    matched_details.append({
                        "name": ing,
                        "category": classify(ing),
                        "fridge_item": fridge_item,
                        "receipt_item_id": receipt_item_id_map.get(fridge_item),
                        "expiry_date": expiry_date.isoformat() if expiry_date else None,
                        "days_until_expiry": _days_until(expiry_date),
                        "grams_per_portion": (
                            round(grams_per_portion, 2)
                            if grams_per_portion is not None else None
                        ),
                        "price_per_gram": (
                            round(price_per_gram, 4)
                            if price_per_gram is not None else None
                        ),
                        "estimated_cost": (
                            round(ingredient_cost, 2)
                            if ingredient_cost is not None else None
                        ),
                        "pack_price": (
                            round(pack_price, 2)
                            if pack_price is not None else None
                        ),
                        "cost_status": (
                            "estimated"
                            if ingredient_cost is not None else cost_status
                        ),
                        "weight_confidence": (
                            portion_detail.get("weight_confidence")
                            if portion_detail else None
                        ),
                    })

            mc = len(matched)
            total = len(ingredients)

            if not is_recipe_allowed(ingredients_raw, active_prefs):
                continue

            if strict_only:
                if mc != total:
                    continue
            else:
                # Require at least 2 overlapping ingredients AND at least
                # MIN_MATCH_RATIO of the recipe's ingredients in the fridge.
                # Without the ratio floor the list fills with sparse matches
                # (e.g. 2 of 15) that aren't real recommendations.
                if mc < 2:
                    continue
                if total > 0 and (mc / total) < MIN_MATCH_RATIO:
                    continue

            estimated_cost = round(cost, 2) if costed_ingredient_count else None
            if max_cost is not None and estimated_cost is not None and estimated_cost > max_cost:
                continue

            ingredients_with_cat = [
                {"name": ing, "category": classify(ing)}
                for ing in ingredients
            ]
            matched_with_cat = matched_details

            expiring_matches = sorted(
                [
                    detail for detail in matched_details
                    if detail["days_until_expiry"] is not None
                ],
                key=lambda detail: (detail["days_until_expiry"], detail["name"]),
            )
            earliest_match = expiring_matches[0] if expiring_matches else None

            tags = _compute_tags(m, ingredients_with_cat)

            # hide_drinks toggle — classifier-backed
            if hide_drinks and "drink" in tags:
                continue

            # tag filter — recipe must satisfy ALL selected tags
            if selected_tags and not all(t in tags for t in selected_tags):
                continue

            all_recipes.append({
                "id": m["id"],
                "name": m["name"],
                "calories": m["calories"],
                "protein": m["protein"],
                "carbohydrates": m["carbohydrates"],
                "sugar": m["sugar"],
                "total_fat": m["total_fat"],
                "saturated_fat": m["saturated_fat"],
                "sodium": m["sodium"],
                "minutes": m["minutes"],
                "n_ingredients": m["n_ingredients"],
                "ingredients": ingredients_with_cat,
                "steps": [s.strip() for s in (m["steps_clean"] or "").split("|") if s.strip()],
                "matched_ingredients": matched_with_cat,
                "match_count": mc,
                "total_ingredients": total,
                "match_score": round(mc / total, 2),
                "estimated_cost": estimated_cost,
                "cost_source": cost_source,
                "costed_grams": round(costed_grams, 2),
                "costed_ingredient_count": costed_ingredient_count,
                "uncosted_ingredient_count": uncosted_ingredient_count,
                "estimated_cost_coverage": (
                    round(costed_ingredient_count / mc, 2) if mc else 0
                ),
                "pack_price_total": round(pack_price_total, 2),
                "tags": tags,
                "earliest_expiry_date": (
                    earliest_match["expiry_date"] if earliest_match else None
                ),
                "earliest_expiry_days": (
                    earliest_match["days_until_expiry"] if earliest_match else None
                ),
                "earliest_expiring_ingredient": (
                    earliest_match["name"] if earliest_match else None
                ),
                "expiring_match_count": len(expiring_matches),
            })

        # ---- Sorting ----
        # All sort keys use a numeric falsy-safe fallback so recipes with
        # None for the column sort to the end (descending) or start (ascending).
        if sort_key == "expiry":
            all_recipes.sort(
                key=lambda x: (
                    _expiry_sort_value(x),
                    -x["expiring_match_count"],
                    -x["match_score"],
                    -x["match_count"],
                    x["name"],
                )
            )
        elif sort_key == "highest_protein":
            all_recipes.sort(
                key=lambda x: (-(x["protein"] if x["protein"] is not None else -1),
                               _expiry_sort_value(x), -x["match_score"], x["name"])
            )
        elif sort_key == "lowest_calories":
            all_recipes.sort(
                key=lambda x: (x["calories"] if x["calories"] is not None else 10**9,
                               _expiry_sort_value(x), -x["match_score"], x["name"])
            )
        elif sort_key == "highest_calories":
            all_recipes.sort(
                key=lambda x: (-(x["calories"] if x["calories"] is not None else -1),
                               _expiry_sort_value(x), -x["match_score"], x["name"])
            )
        else:  # default: "match"
            all_recipes.sort(
                key=lambda x: (
                    -x["match_score"],
                    _expiry_sort_value(x),
                    -x["match_count"],
                    x["name"],
                )
            )

        # ---- Summary counts for the informative header ----
        strict_count = sum(
            1 for r in all_recipes
            if r["total_ingredients"] > 0 and r["match_count"] == r["total_ingredients"]
        )
        one_missing_count = sum(
            1 for r in all_recipes
            if (r["total_ingredients"] - r["match_count"]) == 1
        )

        # Pagination slice
        total = len(all_recipes)
        total_pages = (total + per_page - 1) // per_page if per_page else 1
        if total_pages == 0:
            total_pages = 1
        # Clamp page
        if page > total_pages:
            page = total_pages
        start = (page - 1) * per_page
        end = start + per_page
        slice_ = all_recipes[start:end]

        base_response.update({
            "recommendations": slice_,
            "total": total,
            "page": page,
            "total_pages": total_pages,
            "sort": sort_key,
            "strict_count": strict_count,
            "one_missing_count": one_missing_count,
        })

        return jsonify(base_response), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
