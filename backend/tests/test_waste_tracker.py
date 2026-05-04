from datetime import date, timedelta

from core.database import db
from modules.receipt.schema import ReceiptItem


def test_waste_event_can_be_logged(client):
    today = date.today().isoformat()

    response = client.post("/api/waste/events", json={
        "item_name": "Spinach",
        "category": "vegetables",
        "event_type": "wasted",
        "quantity_grams": 250,
        "quantity_label": "half bag",
        "cost_impact": 2.5,
        "reason": "expired",
        "event_date": today,
    })

    assert response.status_code == 201, response.get_json()
    event = response.get_json()["event"]
    assert event["item_name"] == "Spinach"
    assert event["event_type"] == "wasted"
    assert event["quantity_grams"] == 250
    assert event["cost_impact"] == 2.5
    assert event["event_date"] == today


def test_cooked_meal_can_be_logged_and_listed(client):
    today = date.today().isoformat()

    response = client.post("/api/waste/cooked-meals", json={
        "recipe_id": 42,
        "recipe_name": "Chicken Tomato Pasta",
        "servings": 2,
        "quantity_grams": 650,
        "cooked_date": today,
        "notes": "Used expiring tomato",
        "metadata": {
            "cooked_time": "18:30",
            "action": "cooked",
            "ingredient_usage": [
                {
                    "item": "Chicken breast",
                    "category": "protein",
                    "usage": "300 g used",
                    "remaining": "200 g",
                    "status": "partial",
                    "grams_used": 300,
                }
            ],
        },
    })

    assert response.status_code == 201, response.get_json()
    cooked = response.get_json()["cooked_meal"]
    assert cooked["recipe_id"] == 42
    assert cooked["recipe_name"] == "Chicken Tomato Pasta"
    assert cooked["servings"] == "2 servings"
    assert cooked["quantity_grams"] == 650
    assert cooked["cooked_date"] == today
    assert cooked["cooked_time"] == "18:30"
    assert cooked["ingredient_usage"][0]["item"] == "Chicken breast"

    response = client.get("/api/waste/cooked-meals?days=7")

    assert response.status_code == 200, response.get_json()
    cooked_meals = response.get_json()["cooked_meals"]
    assert len(cooked_meals) == 1
    assert cooked_meals[0]["name"] == "Chicken Tomato Pasta"
    assert cooked_meals[0]["metadata"]["action"] == "cooked"


def test_cooked_meal_decrements_measurable_fridge_quantity(app, client):
    today = date.today().isoformat()
    with app.app_context():
        item = ReceiptItem(
            receipt_filename="receipt.jpg",
            receipt_path="uploads/receipt.jpg",
            name="Chicken breast",
            matched_name="chicken breast",
            qty="500 g",
            price=10.0,
        )
        db.session.add(item)
        db.session.commit()
        item_id = item.id

    response = client.post("/api/waste/cooked-meals", json={
        "recipe_id": 42,
        "recipe_name": "Chicken Tomato Pasta",
        "servings": 1,
        "quantity_grams": 300,
        "cooked_date": today,
        "metadata": {
            "ingredient_usage": [
                {
                    "item": "Chicken breast",
                    "receipt_item_id": item_id,
                    "grams_used": 300,
                }
            ],
        },
    })

    assert response.status_code == 201, response.get_json()
    assert response.get_json()["fridge_updates"][0]["new_qty"] == "200 g"

    with app.app_context():
        item = db.session.get(ReceiptItem, item_id)
        assert item.qty == "200 g"
        assert item.price == 4.0


def test_waste_analytics_returns_dashboard_shape(app, client):
    today = date.today()
    with app.app_context():
        db.session.add(ReceiptItem(
            receipt_filename="receipt.jpg",
            receipt_path="uploads/receipt.jpg",
            name="Spinach",
            matched_name="spinach",
            qty="120 g",
            price=3.0,
            expiry_date=today + timedelta(days=1),
        ))
        db.session.commit()

    events = [
        {
            "item_name": "Spinach",
            "category": "vegetables",
            "event_type": "wasted",
            "quantity_grams": 600,
            "cost_impact": 5,
            "event_date": today.isoformat(),
        },
        {
            "item_name": "Milk",
            "category": "dairy",
            "event_type": "expired",
            "quantity_grams": 400,
            "cost_impact": 2,
            "event_date": (today - timedelta(days=1)).isoformat(),
        },
        {
            "item_name": "Bread",
            "category": "grains",
            "event_type": "wasted",
            "quantity_grams": 2000,
            "cost_impact": 6,
            "event_date": (today - timedelta(days=8)).isoformat(),
        },
        {
            "item_name": "Tomato sauce",
            "category": "vegetables",
            "event_type": "saved_leftover",
            "quantity_grams": 300,
            "cost_impact": 1,
            "event_date": today.isoformat(),
        },
    ]
    for event in events:
        response = client.post("/api/waste/events", json=event)
        assert response.status_code == 201, response.get_json()
    response = client.post("/api/waste/cooked-meals", json={
        "recipe_id": 99,
        "recipe_name": "Tomato Pasta",
        "servings": 1,
        "quantity_grams": 0,
        "cooked_date": today.isoformat(),
    })
    assert response.status_code == 201, response.get_json()

    response = client.get("/api/waste/analytics?days=7")

    assert response.status_code == 200, response.get_json()
    data = response.get_json()
    assert data["period"]["days"] == 7
    assert data["weekly_summary"]["total_wasted_grams"] == 1000
    assert data["weekly_summary"]["total_wasted_kg"] == 1.0
    assert data["weekly_summary"]["money_lost"] == 7.0
    assert data["weekly_summary"]["co2_impact_kg"] == 2.5
    assert data["weekly_summary"]["saved_from_waste_grams"] == 300
    assert data["weekly_summary"]["cooked_meal_count"] == 1
    assert data["cooked_meals"][0]["recipe_name"] == "Tomato Pasta"
    assert data["weekly_summary"]["comparison_to_last_period_pct"] == -50.0
    assert data["waste_breakdown"][0]["category"] == "vegetables"
    assert data["top_wasted_items"][0]["name"] == "spinach"
    assert data["at_risk_items"][0]["name"] == "spinach"
    assert data["smart_insights"]
    assert data["quick_actions"][0]["key"] == "log_food_waste"


def test_waste_event_rejects_unknown_event_type(client):
    response = client.post("/api/waste/events", json={
        "item_name": "Spinach",
        "event_type": "lost",
    })

    assert response.status_code == 400
    assert "event_type" in response.get_json()["error"]
