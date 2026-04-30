from datetime import date

from core.database import db
from modules.receipt.schema import ReceiptItem
from sqlalchemy import text


def _create_recipes_table():
    db.session.execute(text("""
        CREATE TABLE recipes (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            ingredients_clean TEXT,
            steps_clean TEXT,
            calories DOUBLE PRECISION,
            protein DOUBLE PRECISION,
            carbohydrates DOUBLE PRECISION,
            sugar DOUBLE PRECISION,
            total_fat DOUBLE PRECISION,
            saturated_fat DOUBLE PRECISION,
            sodium DOUBLE PRECISION,
            minutes INTEGER,
            n_ingredients INTEGER
        )
    """))


def _insert_recipe(recipe_id, name, ingredients):
    db.session.execute(text("""
        INSERT INTO recipes (
            id,
            name,
            ingredients_clean,
            steps_clean,
            calories,
            protein,
            carbohydrates,
            sugar,
            total_fat,
            saturated_fat,
            sodium,
            minutes,
            n_ingredients
        )
        VALUES (
            :id,
            :name,
            :ingredients,
            'prep|cook',
            400,
            20,
            40,
            5,
            10,
            2,
            20,
            25,
            :count
        )
    """), {
        "id": recipe_id,
        "name": name,
        "ingredients": "|".join(ingredients),
        "count": len(ingredients),
    })


def test_recommendations_default_to_soonest_expiring_matched_ingredient(app, client):
    with app.app_context():
        _create_recipes_table()
        db.session.add_all([
            ReceiptItem(
                receipt_filename="receipt.jpg",
                receipt_path="uploads/receipt.jpg",
                name="Chicken Breast",
                matched_name="chicken breast",
                qty="500 g",
                expiry_date=date(2026, 4, 30),
            ),
            ReceiptItem(
                receipt_filename="receipt.jpg",
                receipt_path="uploads/receipt.jpg",
                name="Rice",
                matched_name="rice",
                qty="1 kg",
                expiry_date=date(2026, 5, 10),
            ),
            ReceiptItem(
                receipt_filename="receipt.jpg",
                receipt_path="uploads/receipt.jpg",
                name="Tomato",
                matched_name="tomato",
                qty="4 each",
                expiry_date=date(2026, 5, 3),
            ),
        ])
        _insert_recipe(1, "Tomato Rice Bowl", ["tomato", "rice"])
        _insert_recipe(2, "Chicken Rice", ["chicken breast", "rice"])
        db.session.commit()

    response = client.get("/api/meals/recommendations")

    assert response.status_code == 200
    data = response.get_json()
    assert data["sort"] == "expiry"
    assert [recipe["name"] for recipe in data["recommendations"]] == [
        "Chicken Rice",
        "Tomato Rice Bowl",
    ]

    first = data["recommendations"][0]
    assert first["earliest_expiring_ingredient"] == "chicken breast"
    assert first["earliest_expiry_date"] == "2026-04-30"
    assert first["expiring_match_count"] == 2
    assert first["matched_ingredients"][0]["expiry_date"] == "2026-04-30"

