from flask import Blueprint, jsonify, request
from core.database import db
from sqlalchemy import inspect, text

from modules.nutrition.classifier import classify
from modules.receipt.expiry_reference import estimate_expiry_date
from modules.receipt.service import ensure_receipt_session_schema, normalise_expiry_date

bp = Blueprint("fridge_bp", __name__, url_prefix="/api/fridge")

# The virtual fridge lives in the `receipt_items` table — originally populated
# by the receipt OCR flow, now also accepts manual entries via POST below.
# Manual rows use sentinel values for the receipt_filename / receipt_path
# columns (they're NOT NULL in the schema) so a `WHERE receipt_filename =
# 'manual_entry'` predicate can distinguish the two provenances if it ever
# becomes useful for analytics.
_MANUAL_FILENAME = "manual_entry"
_MANUAL_PATH = "manual"


def _row_to_dict(row):
    m = dict(row._mapping)
    if m.get("expiry_date"):
        expiry_date = m["expiry_date"]
        m["expiry_date"] = (
            expiry_date.isoformat()
            if hasattr(expiry_date, "isoformat")
            else str(expiry_date)
        )
        m["expiry_estimated"] = False
    else:
        base_date = _date_from_value(m.get("created_at"))
        expiry_date = estimate_expiry_date(
            m.get("name") or "",
            matched_name=m.get("matched_name"),
            today=base_date,
        )
        m["expiry_date"] = expiry_date.isoformat() if expiry_date else None
        m["expiry_estimated"] = expiry_date is not None
    if not m.get("category"):
        m["category"] = classify(m.get("name") or "")
    return m


def _date_from_value(value):
    if not value:
        return None
    if hasattr(value, "date"):
        return value.date()
    try:
        return normalise_expiry_date(str(value)[:10])
    except ValueError:
        return None


@bp.route("/items", methods=["GET"])
def get_fridge_items():
    try:
        ensure_receipt_session_schema()
        has_known_ingredients = inspect(db.engine).has_table("known_ingredients")
        # LEFT JOIN known_ingredients to get pre-classified category.
        # Fallback to on-the-fly classification if not seeded yet.
        if has_known_ingredients:
            sql = """
            SELECT
                r.id,
                r.name,
                r.matched_name,
                r.match_score,
                r.qty,
                r.price,
                r.expiry_date,
                r.created_at,
                ki.category AS category
            FROM receipt_items r
            LEFT JOIN known_ingredients ki
              ON LOWER(TRIM(COALESCE(r.matched_name, r.name))) = LOWER(ki.ingredient_name)
            ORDER BY r.created_at DESC
            """
        else:
            sql = """
            SELECT
                r.id,
                r.name,
                r.matched_name,
                r.match_score,
                r.qty,
                r.price,
                r.expiry_date,
                r.created_at,
                NULL AS category
            FROM receipt_items r
            ORDER BY r.created_at DESC
            """

        result = db.session.execute(text(sql))

        rows = [_row_to_dict(row) for row in result]
        return jsonify({"items": rows}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/items", methods=["POST"])
def create_fridge_item():
    """Manual fridge entry. Accepts { name, qty?, price? }. Reuses the same
    receipt_items table as the OCR flow, using sentinel values for the
    filename / path columns so the manual provenance is distinguishable if
    ever needed for analytics."""
    try:
        payload = request.get_json(silent=True) or {}
        name = (payload.get("name") or "").strip()
        if not name:
            return jsonify({"error": "Name is required"}), 400

        qty_raw = payload.get("qty")
        qty = str(qty_raw).strip() if qty_raw not in (None, "") else "1"

        price_raw = payload.get("price")
        price = None
        if price_raw not in (None, ""):
            try:
                p = float(price_raw)
                if p < 0:
                    return jsonify({"error": "Price cannot be negative"}), 400
                price = p
            except (TypeError, ValueError):
                return jsonify({"error": "Price must be a number"}), 400

        try:
            expiry_date = normalise_expiry_date(payload.get("expiry_date"))
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        if expiry_date is None:
            expiry_date = estimate_expiry_date(name)

        inserted = db.session.execute(text("""
            INSERT INTO receipt_items (receipt_filename, receipt_path, name, qty, price, expiry_date)
            VALUES (:fname, :fpath, :name, :qty, :price, :expiry_date)
            RETURNING id, name, qty, price, expiry_date, created_at
        """), {
            "fname": _MANUAL_FILENAME,
            "fpath": _MANUAL_PATH,
            "name":  name,
            "qty":   qty,
            "price": price,
            "expiry_date": expiry_date,
        }).fetchone()
        db.session.commit()

        row = _row_to_dict(inserted)
        return jsonify({"item": row}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@bp.route("/items/<int:item_id>", methods=["PATCH"])
def update_fridge_item(item_id):
    """Partial update. Any subset of { name, qty, price } may be provided.
    Returns the updated row."""
    try:
        payload = request.get_json(silent=True) or {}
        sets = []
        params = {"id": item_id}

        if "name" in payload:
            name = (payload.get("name") or "").strip()
            if not name:
                return jsonify({"error": "Name cannot be blank"}), 400
            sets.append("name = :name")
            params["name"] = name

        if "qty" in payload:
            qty_raw = payload.get("qty")
            qty = str(qty_raw).strip() if qty_raw not in (None, "") else "1"
            sets.append("qty = :qty")
            params["qty"] = qty

        if "price" in payload:
            price_raw = payload.get("price")
            if price_raw in (None, ""):
                sets.append("price = NULL")
            else:
                try:
                    p = float(price_raw)
                    if p < 0:
                        return jsonify({"error": "Price cannot be negative"}), 400
                    sets.append("price = :price")
                    params["price"] = p
                except (TypeError, ValueError):
                    return jsonify({"error": "Price must be a number"}), 400

        if "expiry_date" in payload:
            try:
                expiry_date = normalise_expiry_date(payload.get("expiry_date"))
            except ValueError as e:
                return jsonify({"error": str(e)}), 400
            if expiry_date is None:
                sets.append("expiry_date = NULL")
            else:
                sets.append("expiry_date = :expiry_date")
                params["expiry_date"] = expiry_date

        if not sets:
            return jsonify({"error": "No updatable fields supplied"}), 400

        stmt = f"""
            UPDATE receipt_items
            SET {', '.join(sets)}
            WHERE id = :id
            RETURNING id, name, qty, price, expiry_date, created_at
        """
        updated = db.session.execute(text(stmt), params).fetchone()
        if not updated:
            db.session.rollback()
            return jsonify({"error": "Item not found"}), 404
        db.session.commit()

        row = _row_to_dict(updated)
        return jsonify({"item": row}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@bp.route("/items/<int:item_id>", methods=["DELETE"])
def delete_fridge_item(item_id):
    try:
        result = db.session.execute(text("""
            DELETE FROM receipt_items WHERE id = :id
        """), {"id": item_id})
        db.session.commit()
        if result.rowcount == 0:
            return jsonify({"error": "Item not found"}), 404
        return jsonify({"deleted": True, "id": item_id}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
