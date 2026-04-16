from flask import Blueprint, request, jsonify
from core.database import db
from sqlalchemy import text

recipe_bp = Blueprint("recipe_bp", __name__, url_prefix="/api/recipes")


@recipe_bp.route("/", methods=["GET"])
def get_recipes():
    limit = request.args.get("limit", 20, type=int)

    result = db.session.execute(text("""
        SELECT id, name, minutes, n_ingredients, calories, protein
        FROM recipes
        LIMIT :limit
    """), {"limit": limit})

    rows = [dict(row._mapping) for row in result]

    return jsonify(rows), 200


@recipe_bp.route("/search", methods=["GET"])
def search_recipes():
    ingredient = request.args.get("ingredient", "").strip().lower()

    if not ingredient:
        return jsonify({"error": "ingredient query is required"}), 400

    result = db.session.execute(text("""
        SELECT id, name, minutes, n_ingredients, ingredients_clean
        FROM recipes
        WHERE ingredients_clean LIKE :pattern
        LIMIT 50
    """), {"pattern": f"%{ingredient}%"})

    rows = [dict(row._mapping) for row in result]

    return jsonify(rows), 200


@recipe_bp.route("/<int:recipe_id>", methods=["GET"])
def get_recipe_by_id(recipe_id):
    result = db.session.execute(text("""
        SELECT *
        FROM recipes
        WHERE id = :recipe_id
    """), {"recipe_id": recipe_id})

    row = result.fetchone()

    if row is None:
        return jsonify({"error": "Recipe not found"}), 404

    return jsonify(dict(row._mapping)), 200
