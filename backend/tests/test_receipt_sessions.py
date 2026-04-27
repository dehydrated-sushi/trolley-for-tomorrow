from io import BytesIO

from core.database import db
from modules.receipt.schema import Receipt, ReceiptItem
from modules.receipt.service import create_receipt_session


def test_parse_creates_receipt_session_without_saving_items(app, client, monkeypatch, tmp_path):
    import routes.receipt_routes as receipt_routes

    monkeypatch.setattr(receipt_routes, "UPLOAD_FOLDER", str(tmp_path))
    monkeypatch.setattr(
        receipt_routes,
        "process_receipt",
        lambda _path: [{"name": "milk", "qty": "2 l", "price": 4.5}],
    )

    response = client.post(
        "/api/receipts/parse",
        data={"file": (BytesIO(b"fake image bytes"), "coles-receipt.jpg")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["receipt_id"]
    assert data["scan_status"] == "parsed"
    assert data["count"] == 1

    with app.app_context():
        receipt = db.session.get(Receipt, data["receipt_id"])
        assert receipt is not None
        assert receipt.original_filename == "coles-receipt.jpg"
        assert receipt.scan_status == "parsed"
        assert receipt.item_count == 1
        assert receipt.total_amount == 4.5
        assert ReceiptItem.query.count() == 0


def test_commit_links_receipt_items_to_existing_session(app, client):
    with app.app_context():
        receipt = create_receipt_session(
            receipt_filename="woolies.jpg",
            receipt_path="uploads/woolies.jpg",
        )
        receipt_id = receipt.id

    response = client.post(
        "/api/receipts/commit",
        json={
            "receipt_id": receipt_id,
            "filename": "woolies.jpg",
            "items": [
                {"name": "baby spinach", "qty": "120 g", "price": "3.50"},
                {"name": "eggs", "qty": "12 pack", "price": "6.20"},
            ],
        },
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["receipt_id"] == receipt_id
    assert data["scan_status"] == "saved"
    assert data["count"] == 2

    with app.app_context():
        receipt = db.session.get(Receipt, receipt_id)
        items = ReceiptItem.query.order_by(ReceiptItem.id).all()
        assert receipt.scan_status == "saved"
        assert receipt.item_count == 2
        assert receipt.total_amount == 9.7
        assert [item.receipt_id for item in items] == [receipt_id, receipt_id]


def test_list_receipt_sessions_returns_recent_sessions(app, client):
    with app.app_context():
        first = create_receipt_session(
            receipt_filename="first.jpg",
            receipt_path="uploads/first.jpg",
        )
        second = create_receipt_session(
            receipt_filename="second.jpg",
            receipt_path="uploads/second.jpg",
        )
        first_id = first.id
        second_id = second.id

    response = client.get("/api/receipts/sessions")

    assert response.status_code == 200
    data = response.get_json()
    assert data["count"] == 2
    assert [session["id"] for session in data["sessions"]] == [second_id, first_id]
    assert data["sessions"][0]["original_filename"] == "second.jpg"


def test_get_receipt_session_returns_bought_items(app, client):
    with app.app_context():
        receipt = create_receipt_session(
            receipt_filename="items.jpg",
            receipt_path="uploads/items.jpg",
        )
        receipt_id = receipt.id

    client.post(
        "/api/receipts/commit",
        json={
            "receipt_id": receipt_id,
            "filename": "items.jpg",
            "items": [
                {"name": "milk", "qty": "2 l", "price": "4.50"},
                {"name": "bread", "qty": "1", "price": "3.20"},
            ],
        },
    )

    response = client.get(f"/api/receipts/sessions/{receipt_id}")

    assert response.status_code == 200
    data = response.get_json()
    assert data["session"]["id"] == receipt_id
    assert data["count"] == 2
    assert [item["name"] for item in data["items"]] == ["milk", "bread"]
    assert [item["receipt_id"] for item in data["items"]] == [receipt_id, receipt_id]
