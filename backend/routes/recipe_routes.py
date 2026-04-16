from flask import Blueprint, request, jsonify
from db import get_db_connection

recipe_bp = Blueprint("recipe_bp", __name__, url_prefix="/api/recipes")


@recipe_bp.route("/", methods=["GET"])
def get_recipes():
    conn = get_db_connection()
    cursor = conn.cursor()

    limit = request.args.get("limit", 20, type=int)

    cursor.execute("""
        SELECT id, name, minutes, n_ingredients, calories, protein
        FROM recipes
        LIMIT ?
    """, (limit,))

    rows = cursor.fetchall()
    conn.close()

    return jsonify([dict(row) for row in rows]), 200


@recipe_bp.route("/search", methods=["GET"])
def search_recipes():
    ingredient = request.args.get("ingredient", "").strip().lower()

    if not ingredient:
        return jsonify({"error": "ingredient query is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, name, minutes, n_ingredients, ingredients_clean
        FROM recipes
        WHERE ingredients_clean LIKE ?
        LIMIT 50
    """, (f"%{ingredient}%",))

    rows = cursor.fetchall()
    conn.close()

    return jsonify([dict(row) for row in rows]), 200


@recipe_bp.route("/<int:recipe_id>", methods=["GET"])
def get_recipe_by_id(recipe_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT *
        FROM recipes
        WHERE id = ?
    """, (recipe_id,))

    row = cursor.fetchone()
    conn.close()

    if row is None:
        return jsonify({"error": "Recipe not found"}), 404

    return jsonify(dict(row)), 200