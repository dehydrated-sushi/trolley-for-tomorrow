"""Shopping list = union of unmatched ingredients across top recommended recipes.
These are items the user doesn't have in the fridge but needs to cook
recommended meals."""
from flask import Blueprint, jsonify, request
from core.database import db
from sqlalchemy import text

from modules.nutrition.classifier import classify
from modules.meal_plan.routes import find_matching_item, SKIP_ITEMS, MIN_ITEM_LENGTH

bp = Blueprint("shopping_list_bp", __name__, url_prefix="/api/shopping")


@bp.route("/list", methods=["GET"])
def get_shopping_list():
    try:
        max_recipes = int(request.args.get("top_recipes", 5))

        rows = db.session.execute(text("""
            SELECT DISTINCT LOWER(TRIM(name)) AS name
            FROM receipt_items
            WHERE name IS NOT NULL AND TRIM(name) != ''
        """)).fetchall()
        all_items = {r._mapping["name"] for r in rows}

        if not all_items:
            return jsonify({"items": [], "note": "No fridge items — upload a receipt first."}), 200

        match_items = {
            item for item in all_items
            if item not in SKIP_ITEMS and len(item) >= MIN_ITEM_LENGTH
        }

        if not match_items:
            return jsonify({"items": [], "note": "No matchable fridge items."}), 200

        like_clauses = []
        params = {}
        for i, item in enumerate(match_items):
            p = f"i{i}"
            like_clauses.append(f"ingredients_clean LIKE :{p}")
            params[p] = f"%{item}%"

        where_sql = " OR ".join(like_clauses)
        recipe_result = db.session.execute(text(
            f"SELECT id, name, ingredients_clean "
            f"FROM recipes "
            f"WHERE ingredients_clean IS NOT NULL AND ({where_sql}) "
            f"LIMIT 8000"
        ), params)

        scored = []
        for row in recipe_result:
            m = row._mapping
            ingredients = [i.strip() for i in (m["ingredients_clean"] or "").split("|") if i.strip()]
            if not ingredients:
                continue
            matched, unmatched = [], []
            for ing in ingredients:
                if find_matching_item(ing, match_items):
                    matched.append(ing)
                else:
                    unmatched.append(ing)
            mc = len(matched)
            total = len(ingredients)
            if mc < 2:
                continue
            scored.append({
                "recipe_id": m["id"],
                "recipe_name": m["name"],
                "unmatched": unmatched,
                "score": mc / total,
                "mc": mc,
            })

        scored.sort(key=lambda x: (-x["score"], -x["mc"]))
        top = scored[:max_recipes]

        agg = {}
        for rec in top:
            for ing in rec["unmatched"]:
                key = ing.lower()
                if key in agg:
                    agg[key]["needed_for"].append(rec["recipe_name"])
                else:
                    agg[key] = {
                        "name": ing,
                        "category": classify(ing),
                        "needed_for": [rec["recipe_name"]],
                    }

        items = sorted(agg.values(), key=lambda x: (-len(x["needed_for"]), x["name"]))

        return jsonify({
            "items": items,
            "based_on_recipes": [
                {"id": r["recipe_id"], "name": r["recipe_name"]} for r in top
            ],
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
