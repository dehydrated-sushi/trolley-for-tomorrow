import os
import sys
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values


BASE_DIR = Path(__file__).resolve().parents[1]

RECIPES_CSV = BASE_DIR / "data" / "processed" / "recipes_clean.csv"
KNOWN_CSV = BASE_DIR / "data" / "processed" / "known_ingredients.csv"

load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL is missing in backend/.env")
    sys.exit(1)


def get_connection():
    return psycopg2.connect(DATABASE_URL)


def create_tables():
    schema_sql = """
    CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        minutes INTEGER,
        n_ingredients INTEGER,
        ingredients_clean TEXT,
        steps_clean TEXT,
        calories DOUBLE PRECISION,
        total_fat DOUBLE PRECISION,
        sugar DOUBLE PRECISION,
        sodium DOUBLE PRECISION,
        protein DOUBLE PRECISION,
        saturated_fat DOUBLE PRECISION,
        carbohydrates DOUBLE PRECISION
    );

    CREATE TABLE IF NOT EXISTS known_ingredients (
        id SERIAL PRIMARY KEY,
        ingredient_name TEXT UNIQUE NOT NULL,
        category TEXT
    );

    CREATE TABLE IF NOT EXISTS receipts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER DEFAULT 1,
        original_filename TEXT NOT NULL,
        stored_file_path TEXT,
        scan_source TEXT DEFAULT 'upload',
        store_name TEXT,
        purchase_date DATE,
        scan_status TEXT DEFAULT 'uploaded',
        raw_ocr_text TEXT,
        parser_version TEXT,
        item_count INTEGER DEFAULT 0,
        total_amount DOUBLE PRECISION,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS receipt_items (
        id SERIAL PRIMARY KEY,
        receipt_id INTEGER REFERENCES receipts(id),
        receipt_filename TEXT,
        receipt_path TEXT,
        name TEXT NOT NULL,
        matched_name TEXT,
        match_score DOUBLE PRECISION,
        qty TEXT,
        price DOUBLE PRECISION,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE receipt_items
        ADD COLUMN IF NOT EXISTS receipt_id INTEGER REFERENCES receipts(id);

    ALTER TABLE receipt_items
        ADD COLUMN IF NOT EXISTS matched_name TEXT;

    ALTER TABLE receipt_items
        ADD COLUMN IF NOT EXISTS match_score DOUBLE PRECISION;

    CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id
        ON receipt_items (receipt_id);

    CREATE TABLE IF NOT EXISTS fridge_items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        quantity DOUBLE PRECISION DEFAULT 1,
        unit TEXT,
        price DOUBLE PRECISION,
        expiry_date DATE,
        source TEXT DEFAULT 'receipt',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER DEFAULT 1,
        preference_key TEXT NOT NULL,
        preference_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_favourites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER DEFAULT 1,
        recipe_id INTEGER,
        recipe_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shopping_list (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        quantity DOUBLE PRECISION DEFAULT 1,
        unit TEXT,
        estimated_price DOUBLE PRECISION,
        checked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meal_logs (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER,
        recipe_name TEXT,
        eaten_quantity DOUBLE PRECISION DEFAULT 1,
        calories DOUBLE PRECISION,
        protein DOUBLE PRECISION,
        carbs DOUBLE PRECISION,
        fat DOUBLE PRECISION,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(schema_sql)

    print("Tables checked/created successfully.")


def clean_value(value):
    if pd.isna(value):
        return None
    return value


def load_recipes():
    if not RECIPES_CSV.exists():
        print(f"ERROR: Missing recipes CSV: {RECIPES_CSV}")
        return

    print(f"Reading recipes from: {RECIPES_CSV}")

    recipes_df = pd.read_csv(RECIPES_CSV)

    expected_cols = [
        "id",
        "name",
        "minutes",
        "n_ingredients",
        "ingredients_clean",
        "steps_clean",
        "calories",
        "total_fat",
        "sugar",
        "sodium",
        "protein",
        "saturated_fat",
        "carbohydrates",
    ]

    for col in expected_cols:
        if col not in recipes_df.columns:
            recipes_df[col] = None

    recipes_df = recipes_df[expected_cols]

    recipes_df = recipes_df.dropna(subset=["id", "name"])
    recipes_df["id"] = recipes_df["id"].astype(int)
    recipes_df = recipes_df.drop_duplicates(subset=["id"])

    rows = []
    for _, row in recipes_df.iterrows():
        rows.append(tuple(clean_value(row[col]) for col in expected_cols))

    insert_sql = """
    INSERT INTO recipes (
        id,
        name,
        minutes,
        n_ingredients,
        ingredients_clean,
        steps_clean,
        calories,
        total_fat,
        sugar,
        sodium,
        protein,
        saturated_fat,
        carbohydrates
    )
    VALUES %s
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        minutes = EXCLUDED.minutes,
        n_ingredients = EXCLUDED.n_ingredients,
        ingredients_clean = EXCLUDED.ingredients_clean,
        steps_clean = EXCLUDED.steps_clean,
        calories = EXCLUDED.calories,
        total_fat = EXCLUDED.total_fat,
        sugar = EXCLUDED.sugar,
        sodium = EXCLUDED.sodium,
        protein = EXCLUDED.protein,
        saturated_fat = EXCLUDED.saturated_fat,
        carbohydrates = EXCLUDED.carbohydrates;
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM recipes;")

            execute_values(
                cur,
                insert_sql,
                rows,
                page_size=1000
            )

    print(f"Recipes loaded: {len(rows)}")


def load_known_ingredients():
    if not KNOWN_CSV.exists():
        print(f"ERROR: Missing known ingredients CSV: {KNOWN_CSV}")
        return

    print(f"Reading known ingredients from: {KNOWN_CSV}")

    known_df = pd.read_csv(KNOWN_CSV)

    if "ingredient_name" not in known_df.columns:
        first_col = known_df.columns[0]
        known_df = known_df.rename(columns={first_col: "ingredient_name"})

    if "category" not in known_df.columns:
        known_df["category"] = None

    known_df = known_df[["ingredient_name", "category"]]
    known_df = known_df.dropna(subset=["ingredient_name"])

    known_df["ingredient_name"] = (
        known_df["ingredient_name"]
        .astype(str)
        .str.strip()
        .str.lower()
    )

    known_df = known_df.drop_duplicates(subset=["ingredient_name"])

    rows = []
    for _, row in known_df.iterrows():
        rows.append((
            clean_value(row["ingredient_name"]),
            clean_value(row["category"])
        ))

    insert_sql = """
    INSERT INTO known_ingredients (
        ingredient_name,
        category
    )
    VALUES %s
    ON CONFLICT (ingredient_name) DO UPDATE SET
        category = EXCLUDED.category;
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM known_ingredients;")

            execute_values(
                cur,
                insert_sql,
                rows,
                page_size=1000
            )

    print(f"Known ingredients loaded: {len(rows)}")


def verify_database():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM recipes;")
            recipe_count = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM known_ingredients;")
            ingredient_count = cur.fetchone()[0]

    print("Verification:")
    print(f"- recipes: {recipe_count}")
    print(f"- known_ingredients: {ingredient_count}")


def main():
    print("Connecting to AWS RDS PostgreSQL...")
    print("Database URL loaded from backend/.env")

    create_tables()
    load_recipes()
    load_known_ingredients()
    verify_database()

    print("AWS RDS PostgreSQL database created and loaded successfully.")
    print("Tables created/updated:")
    print("- recipes")
    print("- known_ingredients")
    print("- receipts")
    print("- receipt_items")
    print("- fridge_items")
    print("- user_preferences")
    print("- user_favourites")
    print("- shopping_list")
    print("- meal_logs")


if __name__ == "__main__":
    main()
