"""Receipt ingestion — two-step flow:

1. POST /api/receipts/parse   — runs OCR on the uploaded image, returns a
                                 draft list of items. DOES NOT save to DB.
2. POST /api/receipts/commit  — takes a user-confirmed list of items
                                 (possibly edited) and persists them.

This split lets the frontend show an editable draft table between upload
and save, so users can correct OCR mistakes, remove bogus rows, or add
missing items before anything hits the fridge (user story AC).
"""
from flask import Blueprint, request, jsonify
import os
from werkzeug.utils import secure_filename

from modules.receipt.ocr import process_receipt
from modules.receipt.service import save_receipt_items

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

    return {"name": name, "qty": qty, "price": price}


@receipt_bp.route("/parse", methods=["POST"])
def parse_receipt():
    """Run OCR on the uploaded image. Returns the parsed items as a draft
    for the user to review/edit. Does not save anything."""
    if "file" not in request.files:
        return jsonify({"error": "No file part in request"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    try:
        raw_items = process_receipt(filepath)

        # Normalise for the frontend — always {name, qty, price}
        items = []
        for it in raw_items or []:
            clean = _normalise_item(it)
            if clean:
                items.append(clean)

        return jsonify({
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
        print("PARSE ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


@receipt_bp.route("/commit", methods=["POST"])
def commit_receipt():
    """Save the confirmed (possibly user-edited) items to receipt_items."""
    payload = request.get_json(silent=True) or {}

    items = payload.get("items")
    if not isinstance(items, list):
        return jsonify({"error": "Request body must include 'items' as an array"}), 400

    # Optional metadata: which file this came from (helps trace origin)
    filename = str(payload.get("filename") or "manual_entry").strip() or "manual_entry"

    cleaned = []
    for raw in items:
        norm = _normalise_item(raw)
        if norm:
            cleaned.append(norm)

    if not cleaned:
        return jsonify({"error": "No valid items to save"}), 400

    try:
        saved = save_receipt_items(cleaned, filename, filename)
        return jsonify({
            "message": f"Added {len(saved)} item{'s' if len(saved) != 1 else ''} to your fridge.",
            "items": saved,
            "count": len(saved),
        }), 200
    except Exception as e:
        print("COMMIT ERROR:", str(e))
        return jsonify({"error": str(e)}), 500
