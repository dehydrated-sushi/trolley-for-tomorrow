from flask import Blueprint, jsonify
from db import get_db_connection

bp = Blueprint("fridge_bp", __name__, url_prefix="/api/fridge")


@bp.route("/items", methods=["GET"])
def get_fridge_items():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, name, qty, price, created_at
            FROM receipt_items
            ORDER BY created_at DESC
        """)
        rows = cursor.fetchall()
        conn.close()

        items = [dict(row) for row in rows]

        return jsonify({"items": items}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500