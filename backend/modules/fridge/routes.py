from flask import Blueprint, jsonify
from core.database import db
from sqlalchemy import text

from modules.nutrition.classifier import classify

bp = Blueprint("fridge_bp", __name__, url_prefix="/api/fridge")


@bp.route("/items", methods=["GET"])
def get_fridge_items():
    try:
        # LEFT JOIN known_ingredients to get pre-classified category.
        # Fallback to on-the-fly classification if not seeded yet.
        result = db.session.execute(text("""
            SELECT
                r.id,
                r.name,
                r.qty,
                r.price,
                r.created_at,
                ki.category AS category
            FROM receipt_items r
            LEFT JOIN known_ingredients ki
              ON LOWER(TRIM(r.name)) = LOWER(ki.ingredient_name)
            ORDER BY r.created_at DESC
        """))

        rows = []
        for row in result:
            m = dict(row._mapping)
            # Fallback if no known_ingredients row or category is null
            if not m.get("category"):
                m["category"] = classify(m.get("name") or "")
            rows.append(m)

        return jsonify({"items": rows}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
