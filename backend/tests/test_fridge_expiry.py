from datetime import date, datetime, timedelta

from core.database import db
from modules.receipt.schema import ReceiptItem


def test_food_reference_expiry_estimator_prefers_reference_match(monkeypatch):
    from modules.receipt import expiry_reference

    row = {
        "ingredient_name": "baby spinach",
        "canonical_name": "baby spinach",
        "ingredient_key": "baby spinach",
        "canonical_key": "baby spinach",
        "refrigerated_days": 5,
        "expiry_match_score": 1.0,
        "foodkeeper_name": "Lettuce",
    }
    monkeypatch.setattr(
        expiry_reference,
        "_load_reference",
        lambda: ({"baby spinach": row}, {"baby spinach": row}, [row]),
    )

    assert expiry_reference.estimate_expiry_date(
        "WW Baby Spinach",
        matched_name="baby spinach",
        today=date(2026, 4, 28),
    ) == date(2026, 5, 3)


def test_manual_fridge_item_saves_and_updates_expiry_date(app, client):
    create_response = client.post(
        "/api/fridge/items",
        json={
            "name": "milk",
            "qty": "2 L",
            "price": "4.50",
            "expiry_date": "2026-05-01",
        },
    )

    assert create_response.status_code == 201
    created = create_response.get_json()["item"]
    assert created["expiry_date"] == "2026-05-01"

    update_response = client.patch(
        f"/api/fridge/items/{created['id']}",
        json={"expiry_date": "2026-05-03"},
    )

    assert update_response.status_code == 200
    updated = update_response.get_json()["item"]
    assert updated["expiry_date"] == "2026-05-03"

    with app.app_context():
        item = db.session.get(ReceiptItem, created["id"])
        assert item.expiry_date == date(2026, 5, 3)


def test_manual_fridge_item_estimates_expiry_when_missing(client):
    response = client.post(
        "/api/fridge/items",
        json={
            "name": "mystery ingredient",
            "qty": "1",
        },
    )

    assert response.status_code == 201
    item = response.get_json()["item"]
    assert item["expiry_date"] == (date.today() + timedelta(days=7)).isoformat()
    assert item["expiry_estimated"] is False


def test_fridge_list_estimates_existing_missing_expiry_from_created_at(app, client):
    with app.app_context():
        db.session.add(ReceiptItem(
            receipt_filename="receipt.jpg",
            receipt_path="uploads/receipt.jpg",
            name="mystery ingredient",
            qty="1",
            created_at=datetime(2026, 4, 28, 3, 46, 0),
        ))
        db.session.commit()

    response = client.get("/api/fridge/items")

    assert response.status_code == 200
    item = response.get_json()["items"][0]
    assert item["expiry_date"] == "2026-05-05"
    assert item["expiry_estimated"] is True


def test_manual_fridge_item_rejects_invalid_expiry_date(client):
    response = client.post(
        "/api/fridge/items",
        json={
            "name": "milk",
            "expiry_date": "01-05-2026",
        },
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "expiry_date must be in YYYY-MM-DD format"
