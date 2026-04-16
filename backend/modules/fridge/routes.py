from flask import Blueprint, jsonify
from core.database import db
from sqlalchemy import text

bp = Blueprint("fridge_bp", __name__, url_prefix="/api/fridge")


@bp.route("/items", methods=["GET"])
def get_fridge_items():
    try:
        result = db.session.execute(text("""
            SELECT id, name, qty, price, created_at
            FROM receipt_items
            ORDER BY created_at DESC
        """))
        rows = [dict(row._mapping) for row in result]

        return jsonify({"items": rows}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
