from datetime import date

from core.database import db
from modules.meal_plan.routes import _qty_to_grams
from modules.receipt.schema import ReceiptItem
from sqlalchemy import text


def test_qty_to_grams_uses_only_real_weight_units():
    assert _qty_to_grams("1") is None
    assert _qty_to_grams("4 each") is None
    assert _qty_to_grams("500 g") == 500
    assert _qty_to_grams("1 kg") == 1000
    assert _qty_to_grams("2 x 500g") == 1000


def _create_recipes_table():
    db.session.execute(text("DROP TABLE IF EXISTS recipes"))
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


def _create_recipe_portion_ingredients_table():
    db.session.execute(text("DROP TABLE IF EXISTS recipe_portion_ingredients"))
    db.session.execute(text("""
        CREATE TABLE recipe_portion_ingredients (
            id INTEGER PRIMARY KEY,
            recipe_id INTEGER,
            recipe_name TEXT NOT NULL,
            ingredient_position INTEGER NOT NULL,
            ingredient_name TEXT NOT NULL,
            matched_food_name TEXT,
            canonical_name TEXT,
            category TEXT,
            grams_per_portion DOUBLE PRECISION,
            kcal_per_100g DOUBLE PRECISION,
            kcal_per_portion DOUBLE PRECISION,
            nutrition_source TEXT,
            gram_basis TEXT,
            calorie_scale_factor DOUBLE PRECISION,
            weight_confidence TEXT,
            price_lookup_key TEXT,
            UNIQUE (recipe_id, ingredient_position)
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


def _insert_portion_ingredient(recipe_id, position, ingredient, grams, lookup_key=None):
    db.session.execute(text("""
        INSERT INTO recipe_portion_ingredients (
            recipe_id,
            recipe_name,
            ingredient_position,
            ingredient_name,
            grams_per_portion,
            weight_confidence,
            price_lookup_key
        )
        VALUES (
            :recipe_id,
            'Recipe',
            :position,
            :ingredient,
            :grams,
            'medium',
            :lookup_key
        )
    """), {
        "recipe_id": recipe_id,
        "position": position,
        "ingredient": ingredient,
        "grams": grams,
        "lookup_key": lookup_key or ingredient,
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
                price=10.0,
                expiry_date=date(2026, 4, 30),
            ),
            ReceiptItem(
                receipt_filename="receipt.jpg",
                receipt_path="uploads/receipt.jpg",
                name="Rice",
                matched_name="rice",
                qty="1 kg",
                price=4.0,
                expiry_date=date(2026, 5, 10),
            ),
            ReceiptItem(
                receipt_filename="receipt.jpg",
                receipt_path="uploads/receipt.jpg",
                name="Tomato",
                matched_name="tomato",
                qty="4 each",
                price=3.0,
                expiry_date=date(2026, 5, 3),
            ),
        ])
        _insert_recipe(1, "Tomato Rice Bowl", ["tomato", "rice"])
        _insert_recipe(2, "Chicken Rice", ["chicken breast", "rice"])
        db.session.commit()

    response = client.get("/api/meals/recommendations")

    assert response.status_code == 200, response.get_json()
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


def test_recommendations_cost_uses_portion_grams_and_receipt_price_per_gram(app, client):
    with app.app_context():
        _create_recipes_table()
        _create_recipe_portion_ingredients_table()
        db.session.add_all([
            ReceiptItem(
                receipt_filename="receipt.jpg",
                receipt_path="uploads/receipt.jpg",
                name="Chicken Breast",
                matched_name="chicken breast",
                qty="500 g",
                price=10.0,
                expiry_date=date(2026, 4, 30),
            ),
            ReceiptItem(
                receipt_filename="receipt.jpg",
                receipt_path="uploads/receipt.jpg",
                name="Rice",
                matched_name="rice",
                qty="1 kg",
                price=4.0,
                expiry_date=date(2026, 5, 10),
            ),
        ])
        _insert_recipe(3, "Chicken Rice", ["chicken breast", "rice"])
        _insert_portion_ingredient(3, 1, "chicken breast", 100)
        _insert_portion_ingredient(3, 2, "rice", 75)
        db.session.commit()

    response = client.get("/api/meals/recommendations")

    assert response.status_code == 200, response.get_json()
    recipe = response.get_json()["recommendations"][0]
    assert recipe["name"] == "Chicken Rice"
    assert recipe["cost_source"] == "grams_x_receipt_price_per_gram"
    assert recipe["costed_grams"] == 175.0
    assert recipe["estimated_cost"] == 2.3
    assert recipe["estimated_cost_coverage"] == 1.0
    assert recipe["uncosted_ingredient_count"] == 0
    assert recipe["matched_ingredients"][0]["grams_per_portion"] == 100.0
    assert recipe["matched_ingredients"][0]["price_per_gram"] == 0.02
    assert recipe["matched_ingredients"][0]["estimated_cost"] == 2.0


def test_recommendations_ignore_unitless_quantity_for_price_per_gram(app, client):
    with app.app_context():
        _create_recipes_table()
        _create_recipe_portion_ingredients_table()
        db.session.add_all([
            ReceiptItem(
                receipt_filename="receipt.jpg",
                receipt_path="uploads/receipt.jpg",
                name="Chicken Breast",
                matched_name="chicken breast",
                qty="1",
                price=14.0,
                expiry_date=date(2026, 4, 30),
            ),
            ReceiptItem(
                receipt_filename="receipt.jpg",
                receipt_path="uploads/receipt.jpg",
                name="Rice",
                matched_name="rice",
                qty="1 kg",
                price=4.0,
                expiry_date=date(2026, 5, 10),
            ),
        ])
        _insert_recipe(4, "Chicken Rice", ["chicken breast", "rice"])
        _insert_portion_ingredient(4, 1, "chicken breast", 100)
        _insert_portion_ingredient(4, 2, "rice", 75)
        db.session.commit()

    response = client.get("/api/meals/recommendations")

    assert response.status_code == 200, response.get_json()
    recipe = response.get_json()["recommendations"][0]
    assert recipe["estimated_cost"] == 0.3
    assert recipe["estimated_cost_coverage"] == 0.5
    assert recipe["uncosted_ingredient_count"] == 1
    assert recipe["pack_price_total"] == 14.0
    assert recipe["costed_grams"] == 75.0
    chicken = recipe["matched_ingredients"][0]
    assert chicken["name"] == "chicken breast"
    assert chicken["grams_per_portion"] == 100.0
    assert chicken["price_per_gram"] is None
    assert chicken["estimated_cost"] is None
    assert chicken["pack_price"] == 14.0
    assert chicken["cost_status"] == "missing_receipt_weight"
