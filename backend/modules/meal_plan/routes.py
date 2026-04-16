from flask import Blueprint, jsonify
from core.database import db
from sqlalchemy import text
import ast

bp = Blueprint("meal_plan_bp", __name__, url_prefix="/api/meals")


def normalize_text(value):
    return str(value).strip().lower()


def ingredient_matches(recipe_ingredient, available_items):
    recipe_ingredient = normalize_text(recipe_ingredient)

    for item in available_items:
        item = normalize_text(item)

        if recipe_ingredient == item:
            return True

        if recipe_ingredient in item:
            return True

        if item in recipe_ingredient:
            return True

    return False


@bp.route("/recommendations", methods=["GET"])
def get_meal_recommendations():
    try:
        # get scanned items from receipt_items
        fridge_result = db.session.execute(text("""
            SELECT DISTINCT name
            FROM receipt_items
            WHERE name IS NOT NULL AND TRIM(name) != ''
        """))
        available_items = {normalize_text(row._mapping["name"]) for row in fridge_result}

        # get recipes from recipes dataset table
        recipe_result = db.session.execute(text("""
            SELECT id, name, ingredients_clean, steps_clean, calories
            FROM recipes
        """))

        recommendations = []

        for row in recipe_result:
            mapping = row._mapping
            recipe_id = mapping["id"]
            recipe_name = mapping["name"]
            ingredients_raw = mapping["ingredients_clean"]
            steps_raw = mapping["steps_clean"]
            calories = mapping["calories"]

            try:
                ingredients = ast.literal_eval(ingredients_raw) if ingredients_raw else []
                ingredients = [normalize_text(i) for i in ingredients]
            except Exception:
                continue

            try:
                steps = ast.literal_eval(steps_raw) if steps_raw else []
            except Exception:
                steps = []

            if not ingredients:
                continue

            matched_ingredients = [
                ingredient for ingredient in ingredients
                if ingredient_matches(ingredient, available_items)
            ]

            match_count = len(matched_ingredients)
            total_ingredients = len(ingredients)
            match_score = match_count / total_ingredients if total_ingredients > 0 else 0

            # only recommend recipes with at least 2 matched ingredients
            if match_count >= 2:
                recommendations.append({
                    "id": recipe_id,
                    "name": recipe_name,
                    "calories": calories,
                    "ingredients": ingredients,
                    "steps": steps,
                    "matched_ingredients": matched_ingredients,
                    "match_count": match_count,
                    "total_ingredients": total_ingredients,
                    "match_score": round(match_score, 2)
                })

        recommendations.sort(
            key=lambda x: (-x["match_score"], -x["match_count"], x["name"])
        )

        return jsonify({
            "available_items": sorted(list(available_items)),
            "recommendations": recommendations[:20]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
