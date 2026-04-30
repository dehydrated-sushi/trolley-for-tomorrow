import importlib.util
from pathlib import Path


PIPELINE_PATH = Path(__file__).resolve().parents[2] / "data" / "pipelines" / "clean_recipes.py"
SPEC = importlib.util.spec_from_file_location("clean_recipes_pipeline", PIPELINE_PATH)
clean_recipes = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(clean_recipes)


def test_recipe_portion_weights_are_scaled_to_one_recipe_calorie_portion():
    reference = {
        "chicken breast": {
            "ingredient_name": "chicken breast",
            "canonical_name": "chicken breast",
            "energy_kcal": "100",
            "afcd_match_score": "1.0",
        },
        "rice": {
            "ingredient_name": "rice",
            "canonical_name": "rice",
            "energy_kcal": "350",
            "afcd_match_score": "1.0",
        },
    }
    recipe = {
        "id": "10",
        "name": "Chicken Rice",
        "ingredients_clean": "chicken breast|rice|salt",
        "steps_clean": "serves 2",
        "calories": "450",
    }

    summary, ingredients = clean_recipes.build_recipe_portion(recipe, reference)

    assert summary["recipe_id"] == "10"
    assert summary["serving_hint"] == "2"
    assert summary["portion_basis"] == "estimated_one_portion_scaled_to_recipe_calories"
    assert summary["estimated_kcal_from_weights"] == 450.0
    assert summary["ingredient_count"] == 3
    assert summary["ingredients_with_food_reference"] == 2

    chicken = ingredients[0]
    rice = ingredients[1]
    salt = ingredients[2]
    assert chicken["price_lookup_key"] == "chicken breast"
    assert rice["grams_per_portion"] > 65
    assert salt["grams_per_portion"] == 1.0
    assert salt["gram_basis"] == "minor_seasoning"


def test_recipe_portion_uses_category_defaults_when_food_reference_missing():
    recipe = {
        "id": "11",
        "name": "Dragon Fruit Bowl",
        "ingredients_clean": "dragon fruit|mystery syrup",
        "steps_clean": "",
        "calories": "200",
    }

    summary, ingredients = clean_recipes.build_recipe_portion(recipe, {})

    assert summary["ingredients_with_food_reference"] == 0
    assert summary["ingredients_with_category_default"] == 2
    assert summary["weight_confidence"] == "low"
    assert ingredients[0]["category"] == "fruits"
    assert ingredients[0]["nutrition_source"] == "category_default"

