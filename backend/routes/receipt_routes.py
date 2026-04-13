from flask import Blueprint, request, jsonify
import os
from werkzeug.utils import secure_filename
from modules.receipt.ocr import process_receipt

receipt_bp = Blueprint("receipt_bp", __name__, url_prefix="/api/receipts")

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

    result = process_receipt(filepath, known_items_csv=None)

    return jsonify({
        "message": "File uploaded successfully",
        "filename": filename,
        "filepath": filepath,
        "cleaned_names": result["cleaned_names"],
        "raw_text": result["raw_text"],
        "raw_lines": result["raw_lines"],
    }), 200