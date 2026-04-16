from core.database import db
from modules.receipt.schema import ReceiptItem


def save_receipt_items(items, receipt_filename, receipt_path):
    saved_items = []

    for item in items:
        name = str(item.get("name", "")).strip()
        if not name:
            continue

        qty = item.get("qty", 1)
        price = item.get("price", None)

        try:
            price = float(price) if price not in [None, ""] else None
        except Exception:
            price = None

        receipt_item = ReceiptItem(
            receipt_filename=receipt_filename,
            receipt_path=receipt_path,
            name=name,
            qty=qty,
            price=price,
        )
        db.session.add(receipt_item)

        saved_items.append({
            "name": name,
            "qty": qty,
            "price": price
        })

    db.session.commit()

    return saved_items
