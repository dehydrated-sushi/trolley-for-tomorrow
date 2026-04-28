import argparse
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
FOOD_REFERENCE_CSV = BASE_DIR / "data" / "processed" / "food_reference.csv"

FOOD_REFERENCE_COLUMNS = [
    "ingredient_name",
    "canonical_name",
    "afcd_food_key",
    "afcd_food_name",
    "afcd_match_score",
    "nutrition_basis",
    "energy_kj",
    "energy_kcal",
    "protein_g",
    "fat_total_g",
    "carbohydrates_g",
    "sugars_g",
    "fibre_g",
    "sodium_mg",
    "cpi_category",
    "latest_cpi_period",
    "latest_cpi_index",
    "cpi_monthly_pct_change",
    "cpi_annual_pct_change",
    "foodkeeper_product_id",
    "foodkeeper_name",
    "foodkeeper_subtitle",
    "expiry_match_score",
    "pantry_min_days",
    "pantry_max_days",
    "refrigerate_min_days",
    "refrigerate_max_days",
    "freeze_min_days",
    "freeze_max_days",
]

FOOD_REFERENCE_FLOAT_COLUMNS = {
    "afcd_match_score",
    "energy_kj",
    "energy_kcal",
    "protein_g",
    "fat_total_g",
    "carbohydrates_g",
    "sugars_g",
    "fibre_g",
    "sodium_mg",
    "latest_cpi_index",
    "cpi_monthly_pct_change",
    "cpi_annual_pct_change",
    "expiry_match_score",
}

FOOD_REFERENCE_INTEGER_COLUMNS = {
    "foodkeeper_product_id",
    "pantry_min_days",
    "pantry_max_days",
    "refrigerate_min_days",
    "refrigerate_max_days",
    "freeze_min_days",
    "freeze_max_days",
}

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
        expiry_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE receipt_items
        ADD COLUMN IF NOT EXISTS receipt_id INTEGER REFERENCES receipts(id);

    ALTER TABLE receipt_items
        ADD COLUMN IF NOT EXISTS matched_name TEXT;

    ALTER TABLE receipt_items
        ADD COLUMN IF NOT EXISTS match_score DOUBLE PRECISION;

    ALTER TABLE receipt_items
        ADD COLUMN IF NOT EXISTS expiry_date DATE;

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

    CREATE TABLE IF NOT EXISTS food_reference (
        ingredient_name TEXT PRIMARY KEY,
        canonical_name TEXT,
        afcd_food_key TEXT,
        afcd_food_name TEXT,
        afcd_match_score DOUBLE PRECISION,
        nutrition_basis TEXT,
        energy_kj DOUBLE PRECISION,
        energy_kcal DOUBLE PRECISION,
        protein_g DOUBLE PRECISION,
        fat_total_g DOUBLE PRECISION,
        carbohydrates_g DOUBLE PRECISION,
        sugars_g DOUBLE PRECISION,
        fibre_g DOUBLE PRECISION,
        sodium_mg DOUBLE PRECISION,
        cpi_category TEXT,
        latest_cpi_period DATE,
        latest_cpi_index DOUBLE PRECISION,
        cpi_monthly_pct_change DOUBLE PRECISION,
        cpi_annual_pct_change DOUBLE PRECISION,
        foodkeeper_product_id INTEGER,
        foodkeeper_name TEXT,
        foodkeeper_subtitle TEXT,
        expiry_match_score DOUBLE PRECISION,
        pantry_min_days INTEGER,
        pantry_max_days INTEGER,
        refrigerate_min_days INTEGER,
        refrigerate_max_days INTEGER,
        freeze_min_days INTEGER,
        freeze_max_days INTEGER
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


def clean_food_reference_value(column, value):
    if pd.isna(value):
        return None

    if isinstance(value, str):
        value = value.strip()

    if value in ("", "nan", "NaN", "None"):
        return None

    if column in FOOD_REFERENCE_INTEGER_COLUMNS:
        return int(float(value))

    if column in FOOD_REFERENCE_FLOAT_COLUMNS:
        return float(value)

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


def load_food_reference():
    if not FOOD_REFERENCE_CSV.exists():
        print(f"ERROR: Missing food reference CSV: {FOOD_REFERENCE_CSV}")
        return

    print(f"Reading food reference from: {FOOD_REFERENCE_CSV}")

    food_df = pd.read_csv(
        FOOD_REFERENCE_CSV,
        dtype=str,
        keep_default_na=False,
    )

    missing_cols = [
        column for column in FOOD_REFERENCE_COLUMNS
        if column not in food_df.columns
    ]
    if missing_cols:
        print(f"ERROR: food_reference.csv is missing columns: {missing_cols}")
        return

    food_df = food_df[FOOD_REFERENCE_COLUMNS]
    food_df = food_df[food_df["ingredient_name"].astype(str).str.strip() != ""]
    food_df = food_df.drop_duplicates(subset=["ingredient_name"])

    rows = []
    for _, row in food_df.iterrows():
        rows.append(tuple(
            clean_food_reference_value(column, row[column])
            for column in FOOD_REFERENCE_COLUMNS
        ))

    insert_sql = """
    INSERT INTO food_reference (
        ingredient_name,
        canonical_name,
        afcd_food_key,
        afcd_food_name,
        afcd_match_score,
        nutrition_basis,
        energy_kj,
        energy_kcal,
        protein_g,
        fat_total_g,
        carbohydrates_g,
        sugars_g,
        fibre_g,
        sodium_mg,
        cpi_category,
        latest_cpi_period,
        latest_cpi_index,
        cpi_monthly_pct_change,
        cpi_annual_pct_change,
        foodkeeper_product_id,
        foodkeeper_name,
        foodkeeper_subtitle,
        expiry_match_score,
        pantry_min_days,
        pantry_max_days,
        refrigerate_min_days,
        refrigerate_max_days,
        freeze_min_days,
        freeze_max_days
    )
    VALUES %s
    ON CONFLICT (ingredient_name) DO UPDATE SET
        canonical_name = EXCLUDED.canonical_name,
        afcd_food_key = EXCLUDED.afcd_food_key,
        afcd_food_name = EXCLUDED.afcd_food_name,
        afcd_match_score = EXCLUDED.afcd_match_score,
        nutrition_basis = EXCLUDED.nutrition_basis,
        energy_kj = EXCLUDED.energy_kj,
        energy_kcal = EXCLUDED.energy_kcal,
        protein_g = EXCLUDED.protein_g,
        fat_total_g = EXCLUDED.fat_total_g,
        carbohydrates_g = EXCLUDED.carbohydrates_g,
        sugars_g = EXCLUDED.sugars_g,
        fibre_g = EXCLUDED.fibre_g,
        sodium_mg = EXCLUDED.sodium_mg,
        cpi_category = EXCLUDED.cpi_category,
        latest_cpi_period = EXCLUDED.latest_cpi_period,
        latest_cpi_index = EXCLUDED.latest_cpi_index,
        cpi_monthly_pct_change = EXCLUDED.cpi_monthly_pct_change,
        cpi_annual_pct_change = EXCLUDED.cpi_annual_pct_change,
        foodkeeper_product_id = EXCLUDED.foodkeeper_product_id,
        foodkeeper_name = EXCLUDED.foodkeeper_name,
        foodkeeper_subtitle = EXCLUDED.foodkeeper_subtitle,
        expiry_match_score = EXCLUDED.expiry_match_score,
        pantry_min_days = EXCLUDED.pantry_min_days,
        pantry_max_days = EXCLUDED.pantry_max_days,
        refrigerate_min_days = EXCLUDED.refrigerate_min_days,
        refrigerate_max_days = EXCLUDED.refrigerate_max_days,
        freeze_min_days = EXCLUDED.freeze_min_days,
        freeze_max_days = EXCLUDED.freeze_max_days;
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE food_reference;")

            execute_values(
                cur,
                insert_sql,
                rows,
                page_size=1000
            )

    print(f"Food reference rows loaded: {len(rows)}")


def verify_database():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM recipes;")
            recipe_count = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM known_ingredients;")
            ingredient_count = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM food_reference;")
            food_reference_count = cur.fetchone()[0]

    print("Verification:")
    print(f"- recipes: {recipe_count}")
    print(f"- known_ingredients: {ingredient_count}")
    print(f"- food_reference: {food_reference_count}")


def parse_args():
    parser = argparse.ArgumentParser(description="Initialise/load AWS RDS PostgreSQL data.")
    parser.add_argument(
        "--only-food-reference",
        action="store_true",
        help="Create/update tables and load only backend/data/processed/food_reference.csv.",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    print("Connecting to AWS RDS PostgreSQL...")
    print("Database URL loaded from backend/.env")

    create_tables()
    if args.only_food_reference:
        load_food_reference()
    else:
        load_recipes()
        load_known_ingredients()
        load_food_reference()
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
    print("- food_reference")


if __name__ == "__main__":
    main()
