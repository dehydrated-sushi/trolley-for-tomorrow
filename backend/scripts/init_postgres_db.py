import argparse
import os
import sys
import json
from datetime import date, timedelta
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values


BASE_DIR = Path(__file__).resolve().parents[1]

RECIPES_CSV = BASE_DIR / "data" / "processed" / "recipes_clean.csv"
KNOWN_CSV = BASE_DIR / "data" / "processed" / "known_ingredients.csv"
FOOD_REFERENCE_CSV = BASE_DIR / "data" / "processed" / "food_reference.csv"
RECIPE_PORTION_INGREDIENTS_CSV = BASE_DIR / "data" / "processed" / "recipe_portion_ingredients.csv"

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

RECIPE_PORTION_INGREDIENT_COLUMNS = [
    "recipe_id",
    "recipe_name",
    "ingredient_position",
    "ingredient_name",
    "matched_food_name",
    "canonical_name",
    "category",
    "grams_per_portion",
    "kcal_per_100g",
    "kcal_per_portion",
    "nutrition_source",
    "gram_basis",
    "calorie_scale_factor",
    "weight_confidence",
    "price_lookup_key",
]

RECIPE_PORTION_INTEGER_COLUMNS = {
    "recipe_id",
    "ingredient_position",
}

RECIPE_PORTION_FLOAT_COLUMNS = {
    "calorie_scale_factor",
    "grams_per_portion",
    "kcal_per_100g",
    "kcal_per_portion",
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

    CREATE TABLE IF NOT EXISTS waste_events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER DEFAULT 1,
        receipt_item_id INTEGER,
        recipe_id INTEGER,
        recipe_name TEXT,
        item_name TEXT NOT NULL,
        category TEXT,
        event_type TEXT NOT NULL,
        quantity_grams DOUBLE PRECISION DEFAULT 0,
        quantity_label TEXT,
        cost_impact DOUBLE PRECISION DEFAULT 0,
        reason TEXT,
        metadata_json TEXT,
        event_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE waste_events
        ADD COLUMN IF NOT EXISTS metadata_json TEXT;

    CREATE INDEX IF NOT EXISTS idx_waste_events_event_date
        ON waste_events (event_date);

    CREATE INDEX IF NOT EXISTS idx_waste_events_type
        ON waste_events (event_type);

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

    CREATE TABLE IF NOT EXISTS recipe_portion_ingredients (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
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
    );

    CREATE INDEX IF NOT EXISTS idx_recipe_portion_ingredients_recipe_id
        ON recipe_portion_ingredients (recipe_id);

    CREATE INDEX IF NOT EXISTS idx_recipe_portion_ingredients_lookup
        ON recipe_portion_ingredients (price_lookup_key);
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


def clean_recipe_portion_value(column, value):
    if pd.isna(value):
        return None

    if isinstance(value, str):
        value = value.strip()

    if value in ("", "nan", "NaN", "None"):
        return None

    if column in RECIPE_PORTION_INTEGER_COLUMNS:
        return int(float(value))

    if column in RECIPE_PORTION_FLOAT_COLUMNS:
        return float(value)

    if column == "scale_was_clipped":
        return str(value).strip().lower() in ("1", "true", "yes")

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


def _load_csv_rows(path, columns):
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    missing_cols = [column for column in columns if column not in df.columns]
    if missing_cols:
        print(f"ERROR: {path.name} is missing columns: {missing_cols}")
        return None
    return df[columns]


def load_recipe_portion_ingredients():
    if not RECIPE_PORTION_INGREDIENTS_CSV.exists():
        print(f"Skipping recipe portion ingredients; missing CSV: {RECIPE_PORTION_INGREDIENTS_CSV}")
        return

    print(f"Reading recipe portion ingredients from: {RECIPE_PORTION_INGREDIENTS_CSV}")
    insert_sql = """
    INSERT INTO recipe_portion_ingredients (
        recipe_id,
        recipe_name,
        ingredient_position,
        ingredient_name,
        matched_food_name,
        canonical_name,
        category,
        grams_per_portion,
        kcal_per_100g,
        kcal_per_portion,
        nutrition_source,
        gram_basis,
        calorie_scale_factor,
        weight_confidence,
        price_lookup_key
    )
    VALUES %s
    ON CONFLICT (recipe_id, ingredient_position) DO UPDATE SET
        recipe_name = EXCLUDED.recipe_name,
        ingredient_name = EXCLUDED.ingredient_name,
        matched_food_name = EXCLUDED.matched_food_name,
        canonical_name = EXCLUDED.canonical_name,
        category = EXCLUDED.category,
        grams_per_portion = EXCLUDED.grams_per_portion,
        kcal_per_100g = EXCLUDED.kcal_per_100g,
        kcal_per_portion = EXCLUDED.kcal_per_portion,
        nutrition_source = EXCLUDED.nutrition_source,
        gram_basis = EXCLUDED.gram_basis,
        calorie_scale_factor = EXCLUDED.calorie_scale_factor,
        weight_confidence = EXCLUDED.weight_confidence,
        price_lookup_key = EXCLUDED.price_lookup_key;
    """

    loaded = 0
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM recipe_portion_ingredients;")
            for chunk in pd.read_csv(
                RECIPE_PORTION_INGREDIENTS_CSV,
                dtype=str,
                keep_default_na=False,
                chunksize=50000,
            ):
                missing_cols = [
                    column for column in RECIPE_PORTION_INGREDIENT_COLUMNS
                    if column not in chunk.columns
                ]
                if missing_cols:
                    print(
                        "ERROR: recipe_portion_ingredients.csv is missing columns: "
                        f"{missing_cols}"
                    )
                    return

                chunk = chunk[RECIPE_PORTION_INGREDIENT_COLUMNS]
                rows = []
                for _, row in chunk.iterrows():
                    rows.append(tuple(
                        clean_recipe_portion_value(column, row[column])
                        for column in RECIPE_PORTION_INGREDIENT_COLUMNS
                    ))
                execute_values(cur, insert_sql, rows, page_size=1000)
                loaded += len(rows)

    print(f"Recipe portion ingredient rows loaded: {loaded}")


def load_recipe_portions():
    load_recipe_portion_ingredients()


def _table_exists(cur, table_name):
    cur.execute("""
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = %s
        )
    """, (table_name,))
    return bool(cur.fetchone()[0])


def _delete_if_exists(cur, table_name):
    if _table_exists(cur, table_name):
        cur.execute(f"DELETE FROM {table_name};")
        return True
    return False


def seed_mock_data():
    today = date.today()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)

    receipts = [
        (
            1,
            "mock_weekly_shop_may.csv",
            "seed/mock_weekly_shop_may.csv",
            "seed",
            "Woolworths",
            today.isoformat(),
            "seeded",
            "seeded receipt",
            "mock-v1",
            6,
            27.10,
        ),
    ]

    receipt_items = [
        ("Chicken breast fillets", "chicken breast", 0.98, "600 g", 9.90, today + timedelta(days=2)),
        ("Pasta", "pasta", 0.96, "500 g", 4.10, today + timedelta(days=7)),
        ("Lemon", "lemon", 0.99, "180 g", 1.20, today + timedelta(days=4)),
        ("Cherry tomatoes", "tomato", 0.93, "250 g", 3.00, today + timedelta(days=3)),
        ("Spinach", "spinach", 0.97, "120 g", 2.70, tomorrow),
        ("Pesto", "pesto", 0.91, "190 g", 6.20, today + timedelta(days=14)),
    ]

    shopping_items = [
        ("Greek yogurt", "protein", 1, "tub", 5.50, False),
        ("Bread crumbs", "grains & carbs", 1, "pack", 2.80, False),
        ("Parmesan", "dairy", 1, "bag", 4.60, True),
    ]

    favourites = [
        (1, 47892, "Chicken & Tomato Pasta"),
        (1, 91234, "Broccoli Chicken Pesto Pasta"),
    ]

    meal_logs = [
        (47892, "Chicken & Tomato Pasta", 1, 520, 38, 45, 14),
        (91234, "Broccoli Chicken Pesto Pasta", 1, 610, 42, 39, 24),
    ]

    with get_connection() as conn:
        with conn.cursor() as cur:
            for table_name in (
                "waste_events",
                "meal_logs",
                "shopping_list",
                "user_favourites",
                "fridge_items",
                "receipt_items",
                "receipts",
            ):
                _delete_if_exists(cur, table_name)

            receipt = receipts[0]
            cur.execute("""
                INSERT INTO receipts (
                    user_id,
                    original_filename,
                    stored_file_path,
                    scan_source,
                    store_name,
                    purchase_date,
                    scan_status,
                    raw_ocr_text,
                    parser_version,
                    item_count,
                    total_amount
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, receipt)
            receipt_id = int(cur.fetchone()[0])

            receipt_item_rows = [
                (
                    receipt_id,
                    "mock_weekly_shop_may.csv",
                    "seed/mock_weekly_shop_may.csv",
                    name,
                    matched_name,
                    match_score,
                    qty,
                    price,
                    expiry_date.isoformat(),
                )
                for name, matched_name, match_score, qty, price, expiry_date in receipt_items
            ]
            execute_values(cur, """
                INSERT INTO receipt_items (
                    receipt_id,
                    receipt_filename,
                    receipt_path,
                    name,
                    matched_name,
                    match_score,
                    qty,
                    price,
                    expiry_date
                )
                VALUES %s
            """, receipt_item_rows)

            cur.execute("""
                SELECT id, name, matched_name, qty, price, expiry_date
                FROM receipt_items
                WHERE receipt_id = %s
                ORDER BY id ASC
            """, (receipt_id,))
            seeded_receipt_items = cur.fetchall()
            receipt_lookup = {
                (row[2] or row[1]).strip().lower(): {
                    "receipt_item_id": int(row[0]),
                    "display_name": row[1],
                    "matched_name": row[2] or row[1],
                    "qty": row[3],
                    "price": float(row[4] or 0),
                    "expiry_date": row[5].isoformat() if row[5] else None,
                }
                for row in seeded_receipt_items
            }

            fridge_rows = []
            for row in receipt_lookup.values():
                qty_text = row["qty"] or ""
                amount = 1.0
                unit = "unit"
                parts = qty_text.split()
                if parts:
                    try:
                        amount = float(parts[0])
                    except ValueError:
                        amount = 1.0
                if len(parts) > 1:
                    unit = parts[1]
                fridge_rows.append((
                    row["matched_name"],
                    None,
                    amount,
                    unit,
                    row["price"],
                    row["expiry_date"],
                    "receipt",
                ))

            execute_values(cur, """
                INSERT INTO fridge_items (
                    name,
                    category,
                    quantity,
                    unit,
                    price,
                    expiry_date,
                    source
                )
                VALUES %s
            """, fridge_rows)

            execute_values(cur, """
                INSERT INTO shopping_list (
                    name,
                    category,
                    quantity,
                    unit,
                    estimated_price,
                    checked
                )
                VALUES %s
            """, shopping_items)

            execute_values(cur, """
                INSERT INTO user_favourites (
                    user_id,
                    recipe_id,
                    recipe_name
                )
                VALUES %s
            """, favourites)

            execute_values(cur, """
                INSERT INTO meal_logs (
                    recipe_id,
                    recipe_name,
                    eaten_quantity,
                    calories,
                    protein,
                    carbs,
                    fat
                )
                VALUES %s
            """, meal_logs)

            cooked_meals = [
                {
                    "recipe_id": 47892,
                    "recipe_name": "Chicken & Tomato Pasta",
                    "quantity_grams": 370,
                    "quantity_label": "1 serving",
                    "event_date": today.isoformat(),
                    "metadata": {
                        "action": "cooked",
                        "cooked_time": "18:30",
                        "ingredient_usage": [
                            {
                                "receipt_item_id": receipt_lookup["chicken breast"]["receipt_item_id"],
                                "name": "chicken breast",
                                "display_name": receipt_lookup["chicken breast"]["display_name"],
                                "recipe_ingredient": "chicken breast",
                                "category": "protein",
                                "grams_used": 240,
                                "estimated_cost": 3.96,
                                "price_per_gram": round(receipt_lookup["chicken breast"]["price"] / 600, 4),
                                "expiry_date": receipt_lookup["chicken breast"]["expiry_date"],
                            },
                            {
                                "receipt_item_id": receipt_lookup["pasta"]["receipt_item_id"],
                                "name": "pasta",
                                "display_name": receipt_lookup["pasta"]["display_name"],
                                "recipe_ingredient": "pasta",
                                "category": "grains & carbs",
                                "grams_used": 90,
                                "estimated_cost": 0.74,
                                "price_per_gram": round(receipt_lookup["pasta"]["price"] / 500, 4),
                                "expiry_date": receipt_lookup["pasta"]["expiry_date"],
                            },
                            {
                                "receipt_item_id": receipt_lookup["tomato"]["receipt_item_id"],
                                "name": "tomato",
                                "display_name": receipt_lookup["tomato"]["display_name"],
                                "recipe_ingredient": "cherry tomatoes",
                                "category": "vegetables",
                                "grams_used": 40,
                                "estimated_cost": 0.48,
                                "price_per_gram": round(receipt_lookup["tomato"]["price"] / 250, 4),
                                "expiry_date": receipt_lookup["tomato"]["expiry_date"],
                            },
                        ],
                    },
                },
                {
                    "recipe_id": 91234,
                    "recipe_name": "Broccoli Chicken Pesto Pasta",
                    "quantity_grams": 345,
                    "quantity_label": "1 serving",
                    "event_date": yesterday.isoformat(),
                    "metadata": {
                        "action": "cooked",
                        "cooked_time": "19:10",
                        "ingredient_usage": [
                            {
                                "receipt_item_id": receipt_lookup["chicken breast"]["receipt_item_id"],
                                "name": "chicken breast",
                                "display_name": receipt_lookup["chicken breast"]["display_name"],
                                "recipe_ingredient": "grilled chicken strips",
                                "category": "protein",
                                "grams_used": 160,
                                "estimated_cost": 2.64,
                                "price_per_gram": round(receipt_lookup["chicken breast"]["price"] / 600, 4),
                                "expiry_date": receipt_lookup["chicken breast"]["expiry_date"],
                            },
                            {
                                "receipt_item_id": receipt_lookup["pasta"]["receipt_item_id"],
                                "name": "pasta",
                                "display_name": receipt_lookup["pasta"]["display_name"],
                                "recipe_ingredient": "pasta",
                                "category": "grains & carbs",
                                "grams_used": 85,
                                "estimated_cost": 0.70,
                                "price_per_gram": round(receipt_lookup["pasta"]["price"] / 500, 4),
                                "expiry_date": receipt_lookup["pasta"]["expiry_date"],
                            },
                            {
                                "receipt_item_id": receipt_lookup["pesto"]["receipt_item_id"],
                                "name": "pesto",
                                "display_name": receipt_lookup["pesto"]["display_name"],
                                "recipe_ingredient": "pesto",
                                "category": "other",
                                "grams_used": 45,
                                "estimated_cost": 1.47,
                                "price_per_gram": round(receipt_lookup["pesto"]["price"] / 190, 4),
                                "expiry_date": receipt_lookup["pesto"]["expiry_date"],
                            },
                            {
                                "receipt_item_id": receipt_lookup["spinach"]["receipt_item_id"],
                                "name": "spinach",
                                "display_name": receipt_lookup["spinach"]["display_name"],
                                "recipe_ingredient": "spinach",
                                "category": "vegetables",
                                "grams_used": 55,
                                "estimated_cost": 1.24,
                                "price_per_gram": round(receipt_lookup["spinach"]["price"] / 120, 4),
                                "expiry_date": receipt_lookup["spinach"]["expiry_date"],
                            },
                        ],
                    },
                },
            ]

            cooked_event_ids = []
            for meal in cooked_meals:
                cur.execute("""
                    INSERT INTO waste_events (
                        user_id,
                        recipe_id,
                        recipe_name,
                        item_name,
                        category,
                        event_type,
                        quantity_grams,
                        quantity_label,
                        cost_impact,
                        reason,
                        metadata_json,
                        event_date
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    1,
                    meal["recipe_id"],
                    meal["recipe_name"],
                    meal["recipe_name"],
                    "meal",
                    "cooked",
                    meal["quantity_grams"],
                    meal["quantity_label"],
                    0,
                    "Seeded cooked meal",
                    json.dumps(meal["metadata"]),
                    meal["event_date"],
                ))
                cooked_event_ids.append(int(cur.fetchone()[0]))

            waste_rows = [
                (
                    1,
                    receipt_lookup["spinach"]["receipt_item_id"],
                    91234,
                    "Broccoli Chicken Pesto Pasta",
                    "Spinach",
                    "vegetables",
                    "wasted",
                    28,
                    "28 g",
                    0.63,
                    "Meal leftovers wasted",
                    json.dumps({
                        "cooked_event_id": cooked_event_ids[1],
                        "skip_inventory_update": True,
                    }),
                    today.isoformat(),
                ),
                (
                    1,
                    receipt_lookup["tomato"]["receipt_item_id"],
                    47892,
                    "Chicken & Tomato Pasta",
                    "Cherry tomatoes",
                    "vegetables",
                    "expired",
                    20,
                    "20 g",
                    0.24,
                    "Expired after cooking",
                    json.dumps({
                        "cooked_event_id": cooked_event_ids[0],
                        "skip_inventory_update": True,
                    }),
                    tomorrow.isoformat(),
                ),
            ]

            execute_values(cur, """
                INSERT INTO waste_events (
                    user_id,
                    receipt_item_id,
                    recipe_id,
                    recipe_name,
                    item_name,
                    category,
                    event_type,
                    quantity_grams,
                    quantity_label,
                    cost_impact,
                    reason,
                    metadata_json,
                    event_date
                )
                VALUES %s
            """, waste_rows)

    print("Mock testing data seeded successfully.")
    print("- receipts: 1")
    print(f"- receipt_items: {len(receipt_items)}")
    print(f"- fridge_items: {len(receipt_items)}")
    print(f"- shopping_list: {len(shopping_items)}")
    print(f"- user_favourites: {len(favourites)}")
    print(f"- meal_logs: {len(meal_logs)}")
    print("- cooked meals: 2")
    print("- waste events: 2")


def verify_database():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM recipes;")
            recipe_count = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM known_ingredients;")
            ingredient_count = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM food_reference;")
            food_reference_count = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM recipe_portion_ingredients;")
            recipe_portion_ingredient_count = cur.fetchone()[0]

    print("Verification:")
    print(f"- recipes: {recipe_count}")
    print(f"- known_ingredients: {ingredient_count}")
    print(f"- food_reference: {food_reference_count}")
    print(f"- recipe_portion_ingredients: {recipe_portion_ingredient_count}")


def parse_args():
    parser = argparse.ArgumentParser(description="Initialise/load AWS RDS PostgreSQL data.")
    parser.add_argument(
        "--only-food-reference",
        action="store_true",
        help="Create/update tables and load only backend/data/processed/food_reference.csv.",
    )
    parser.add_argument(
        "--only-recipe-portions",
        action="store_true",
        help="Create/update tables and load only recipe_portion_ingredients.csv.",
    )
    parser.add_argument(
        "--seed-mock-data",
        action="store_true",
        help="Create/update tables and seed realistic testing data into user-state tables.",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    print("Connecting to AWS RDS PostgreSQL...")
    print("Database URL loaded from backend/.env")

    create_tables()
    if args.only_food_reference:
        load_food_reference()
    elif args.only_recipe_portions:
        load_recipe_portions()
    elif args.seed_mock_data:
        seed_mock_data()
    else:
        load_recipes()
        load_known_ingredients()
        load_food_reference()
        load_recipe_portions()
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
    print("- waste_events")
    print("- food_reference")
    print("- recipe_portion_ingredients")


if __name__ == "__main__":
    main()
