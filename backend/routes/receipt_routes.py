from flask import Blueprint, request, jsonify
import os
from werkzeug.utils import secure_filename

from modules.receipt.ocr import process_receipt
from modules.receipt.service import save_receipt_items

receipt_bp = Blueprint("receipt_bp", __name__)

UPLOAD_FOLDER = "uploads"


@receipt_bp.route("/upload", methods=["POST"])
def upload_receipt():
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
        items = process_receipt(filepath)
        print("OCR ITEMS:", items)

        saved_items = save_receipt_items(items, filename, filepath)
        print("SAVED ITEMS:", saved_items)

        return jsonify({
            "message": "Receipt uploaded and items saved successfully",
            "items": saved_items
        }), 200

    except Exception as e:
        print("UPLOAD ERROR:", str(e))
        return jsonify({"error": str(e)}), 500
