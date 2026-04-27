"""Dev-only reset endpoint.

Wipes all USER DATA from the demo database:
  - receipt_items   (the virtual fridge + this-week spending source)
  - receipts        (one row per receipt scan/upload session)
  - user_budget     (weekly spending goal)
  - user_preferences (dietary flags)

Does NOT touch:
  - recipes (the 231k recipe catalogue)
  - known_ingredients (the 14,851-row classifier lookup)

This keeps the app usable after a reset — recipes still load, category
tags still resolve — but the user's personal state is cleared.
"""
from flask import Blueprint, jsonify
from sqlalchemy import text

from core.database import db

bp = Blueprint("dev_bp", __name__, url_prefix="/api/dev")

# Tables that hold per-user state. Delete child rows before receipt sessions
# so PostgreSQL foreign keys do not block the reset.
USER_DATA_TABLES = ("receipt_items", "receipts", "user_budget", "user_preferences")


@bp.route("/reset", methods=["POST"])
def reset_user_data():
    """DELETE all rows from the user-data tables. Tables survive."""
    deleted = {}
    errors = {}

    for tbl in USER_DATA_TABLES:
        try:
            result = db.session.execute(text(f"DELETE FROM {tbl}"))
            deleted[tbl] = result.rowcount
        except Exception as e:
            # Table might not exist yet (e.g. user_preferences only created
            # on first preference-endpoint call). Log but don't fail.
            errors[tbl] = str(e)
            db.session.rollback()

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"commit failed: {e}"}), 500

    total = sum(deleted.values())
    return jsonify({
        "message": f"Reset complete. Cleared {total} row(s).",
        "deleted": deleted,
        "errors": errors,  # usually empty; non-existent tables listed here
    }), 200
