from datetime import date, datetime

from core.database import db
from modules.receipt.expiry_reference import estimate_expiry_date
from modules.receipt.schema import Receipt, ReceiptItem
from sqlalchemy import inspect, text


PARSER_VERSION = "receipt_ocr_v1"


def normalise_expiry_date(value):
    if value in (None, ""):
        return None
    if isinstance(value, date):
        return value

    text_value = str(value).strip()
    if not text_value:
        return None
    try:
        return datetime.strptime(text_value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError("expiry_date must be in YYYY-MM-DD format") from exc


def ensure_receipt_session_schema():
    """Create receipt-session storage without requiring a separate migration.

    The deployed AWS database may already have `receipt_items` from the first
    OCR iteration, so this keeps the migration additive: old rows simply keep
    `receipt_id = NULL`.
    """
    Receipt.__table__.create(bind=db.engine, checkfirst=True)
    ReceiptItem.__table__.create(bind=db.engine, checkfirst=True)

    inspector = inspect(db.engine)
    columns = {
        column["name"]
        for column in inspector.get_columns("receipt_items")
    }

    with db.engine.begin() as conn:
        if "receipt_id" not in columns:
            conn.execute(text("ALTER TABLE receipt_items ADD COLUMN receipt_id INTEGER"))
        if "matched_name" not in columns:
            conn.execute(text("ALTER TABLE receipt_items ADD COLUMN matched_name TEXT"))
        if "match_score" not in columns:
            conn.execute(text("ALTER TABLE receipt_items ADD COLUMN match_score DOUBLE PRECISION"))
        if "expiry_date" not in columns:
            conn.execute(text("ALTER TABLE receipt_items ADD COLUMN expiry_date DATE"))

        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id "
            "ON receipt_items (receipt_id)"
        ))


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


def create_receipt_session(
    receipt_filename,
    receipt_path,
    scan_source="upload",
    user_id=1,
    scan_status="uploaded",
):
    ensure_receipt_session_schema()

    receipt = Receipt(
        user_id=user_id,
        original_filename=receipt_filename,
        stored_file_path=receipt_path,
        scan_source=scan_source,
        scan_status=scan_status,
        parser_version=PARSER_VERSION,
    )
    db.session.add(receipt)
    db.session.commit()
    return receipt


def update_receipt_session(receipt_id, **fields):
    ensure_receipt_session_schema()

    receipt = db.session.get(Receipt, receipt_id)
    if receipt is None:
        return None

    allowed = {
        "scan_status",
        "raw_ocr_text",
        "item_count",
        "total_amount",
        "store_name",
        "purchase_date",
    }
    for key, value in fields.items():
        if key in allowed:
            setattr(receipt, key, value)

    db.session.commit()
    return receipt


def save_receipt_items(items, receipt_filename, receipt_path, receipt_id=None, user_id=1):
    ensure_receipt_session_schema()

    receipt = None
    if receipt_id is not None:
        try:
            receipt_id = int(receipt_id)
        except (TypeError, ValueError):
            raise ValueError("receipt_id must be a number")

        receipt = db.session.get(Receipt, receipt_id)
        if receipt is None:
            raise ValueError("Receipt session not found")
    else:
        receipt = Receipt(
            user_id=user_id,
            original_filename=receipt_filename,
            stored_file_path=receipt_path,
            scan_source="manual" if receipt_filename == "manual_entry" else "commit",
            scan_status="uploaded",
            parser_version=PARSER_VERSION,
        )
        db.session.add(receipt)
        db.session.flush()

    saved_items = []
    saved_models = []

    for item in items:
        name = str(item.get("name", "")).strip()
        if not name:
            continue

        qty = item.get("qty", 1)
        matched_name = str(item.get("matched_name") or "").strip() or None
        match_score = item.get("match_score", None)
        price = item.get("price", None)
        expiry_date = normalise_expiry_date(item.get("expiry_date"))
        if expiry_date is None:
            expiry_date = estimate_expiry_date(name, matched_name=matched_name)

        try:
            price = float(price) if price not in [None, ""] else None
        except Exception:
            price = None

        try:
            match_score = float(match_score) if match_score not in [None, ""] else None
        except Exception:
            match_score = None

        receipt_item = ReceiptItem(
            receipt_id=receipt.id,
            receipt_filename=receipt_filename,
            receipt_path=receipt_path,
            name=name,
            matched_name=matched_name,
            match_score=match_score,
            qty=qty,
            price=price,
            expiry_date=expiry_date,
        )
        db.session.add(receipt_item)
        saved_models.append(receipt_item)

        saved_items.append({
            "receipt_id": receipt.id,
            "name": name,
            "matched_name": matched_name,
            "match_score": match_score,
            "qty": qty,
            "price": price,
            "expiry_date": expiry_date.isoformat() if expiry_date else None,
        })

    receipt.item_count = len(saved_items)
    receipt.total_amount = _total_amount(saved_items)
    receipt.scan_status = "saved"

    db.session.flush()
    for saved, receipt_item in zip(saved_items, saved_models):
        saved["id"] = receipt_item.id

    db.session.commit()

    return receipt, saved_items
