from db import get_db_connection


def save_receipt_items(items, receipt_filename, receipt_path):
    conn = get_db_connection()
    cursor = conn.cursor()

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

        cursor.execute(
            """
            INSERT INTO receipt_items (receipt_filename, receipt_path, name, qty, price)
            VALUES (?, ?, ?, ?, ?)
            """,
            (receipt_filename, receipt_path, name, qty, price)
        )

        saved_items.append({
            "name": name,
            "qty": qty,
            "price": price
        })

    conn.commit()
    conn.close()

    return saved_items