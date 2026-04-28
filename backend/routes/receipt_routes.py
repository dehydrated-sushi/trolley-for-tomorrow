"""Receipt ingestion — two-step flow:

1. POST /api/receipts/parse   — runs OCR on the uploaded image, returns a
                                 receipt session + draft list of items. Does
                                 not save item rows yet.
2. POST /api/receipts/commit  — takes a user-confirmed list of items
                                 (possibly edited) and persists them against
                                 the receipt session.

This split lets the frontend show an editable draft table between upload
and save, so users can correct OCR mistakes, remove bogus rows, or add
missing items before anything hits the fridge (user story AC).
"""
from flask import Blueprint, request, jsonify
import os
from werkzeug.utils import secure_filename

from core.database import db
from modules.receipt.ocr import process_receipt
from modules.receipt.schema import Receipt, ReceiptItem
from modules.receipt.service import (
    create_receipt_session,
    ensure_receipt_session_schema,
    save_receipt_items,
    update_receipt_session,
)

receipt_bp = Blueprint("receipt_bp", __name__)

UPLOAD_FOLDER = "uploads"


def _normalise_item(raw):
    """Clean + validate a single item dict. Returns None if invalid."""
    if not isinstance(raw, dict):
        return None

    name = str(raw.get("name", "")).strip()
    if not name:
        return None

    qty_raw = raw.get("qty")
    if qty_raw in (None, ""):
        qty = 1
    else:
        qty = qty_raw  # can be "1", "500 g", etc.

    price_raw = raw.get("price")
    price = None
    if price_raw not in (None, ""):
        try:
            price = float(price_raw)
            if price < 0:
                price = None
        except (TypeError, ValueError):
            price = None

    item = {"name": name, "qty": qty, "price": price}

    expiry_date = raw.get("expiry_date")
    if expiry_date not in (None, ""):
        item["expiry_date"] = expiry_date

    matched_name = str(raw.get("matched_name") or "").strip()
    if matched_name:
        item["matched_name"] = matched_name

    match_score = raw.get("match_score")
    if match_score not in (None, ""):
        try:
            item["match_score"] = float(match_score)
        except (TypeError, ValueError):
            pass

    return item


def _total_amount(items):
    total = 0.0
    has_price = False
    for item in items:
        price = item.get("price")
        if price in (None, ""):
            continue
        try:
            total += float(price)
            has_price = True
        except (TypeError, ValueError):
            continue
    return round(total, 2) if has_price else None


def _receipt_summary(receipt):
    return {
        "id": receipt.id,
        "original_filename": receipt.original_filename,
        "scan_source": receipt.scan_source,
        "scan_status": receipt.scan_status,
        "item_count": receipt.item_count,
        "total_amount": receipt.total_amount,
        "created_at": receipt.created_at.isoformat() if receipt.created_at else None,
        "updated_at": receipt.updated_at.isoformat() if receipt.updated_at else None,
    }


@receipt_bp.route("/sessions", methods=["GET"])
def list_receipt_sessions():
    """Return recent receipt scan sessions for the frontend history panel."""
    try:
        ensure_receipt_session_schema()
        limit = request.args.get("limit", 50, type=int)
        limit = max(1, min(limit, 200))

        receipts = (
            Receipt.query
            .order_by(Receipt.created_at.desc(), Receipt.id.desc())
            .limit(limit)
            .all()
        )

        return jsonify({
            "sessions": [_receipt_summary(receipt) for receipt in receipts],
            "count": len(receipts),
        }), 200
    except Exception as e:
        print("LIST RECEIPT SESSIONS ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


@receipt_bp.route("/sessions/<int:receipt_id>", methods=["GET"])
def get_receipt_session(receipt_id):
    """Return one receipt session and the items bought in that scan."""
    try:
        ensure_receipt_session_schema()

        receipt = db.session.get(Receipt, receipt_id)
        if receipt is None:
            return jsonify({"error": "Receipt session not found"}), 404

        items = (
            ReceiptItem.query
            .filter(ReceiptItem.receipt_id == receipt_id)
            .order_by(ReceiptItem.id.asc())
            .all()
        )

        return jsonify({
            "session": _receipt_summary(receipt),
            "items": [item.to_dict() for item in items],
            "count": len(items),
        }), 200
    except Exception as e:
        print("GET RECEIPT SESSION ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


@receipt_bp.route("/parse", methods=["POST"])
def parse_receipt():
    """Run OCR on the uploaded image. Returns the parsed items as a draft
    for the user to review/edit. Saves a receipt-session row so every scan
    attempt is traceable, but does not save receipt item rows yet."""
    if "file" not in request.files:
        return jsonify({"error": "No file part in request"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    receipt = create_receipt_session(
        receipt_filename=filename,
        receipt_path=filepath,
        scan_source="upload",
        scan_status="uploaded",
    )

    try:
        raw_items = process_receipt(filepath)

        # Normalise for the frontend — always {name, qty, price}
        items = []
        for it in raw_items or []:
            clean = _normalise_item(it)
            if clean:
                items.append(clean)

        update_receipt_session(
            receipt.id,
            scan_status="parsed",
            item_count=len(items),
            total_amount=_total_amount(items),
        )

        return jsonify({
            "receipt_id": receipt.id,
            "scan_status": "parsed",
            "filename": filename,
            "items": items,
            "count": len(items),
            "message": (
                f"OCR detected {len(items)} item{'s' if len(items) != 1 else ''}."
                if items else
                "OCR could not detect any items. You can add them manually."
            ),
        }), 200

    except Exception as e:
        update_receipt_session(receipt.id, scan_status="failed")
        print("PARSE ERROR:", str(e))
        return jsonify({"receipt_id": receipt.id, "scan_status": "failed", "error": str(e)}), 500


@receipt_bp.route("/commit", methods=["POST"])
def commit_receipt():
    """Save the confirmed (possibly user-edited) items to receipt_items."""
    payload = request.get_json(silent=True) or {}

    items = payload.get("items")
    if not isinstance(items, list):
        return jsonify({"error": "Request body must include 'items' as an array"}), 400

    # Optional metadata: which file this came from (helps trace origin)
    filename = str(payload.get("filename") or "manual_entry").strip() or "manual_entry"
    receipt_id = payload.get("receipt_id")

    cleaned = []
    for raw in items:
        norm = _normalise_item(raw)
        if norm:
            cleaned.append(norm)

    if not cleaned:
        return jsonify({"error": "No valid items to save"}), 400

    try:
        receipt, saved = save_receipt_items(cleaned, filename, filename, receipt_id=receipt_id)
        return jsonify({
            "message": f"Added {len(saved)} item{'s' if len(saved) != 1 else ''} to your fridge.",
            "receipt_id": receipt.id,
            "scan_status": receipt.scan_status,
            "items": saved,
            "count": len(saved),
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print("COMMIT ERROR:", str(e))
        return jsonify({"error": str(e)}), 500
