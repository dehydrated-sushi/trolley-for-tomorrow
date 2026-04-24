import os
import sqlite3

import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_DIR = os.path.join(BASE_DIR, "database")
DB_PATH = os.path.join(DB_DIR, "food_app.db")
RECIPES_CSV = os.path.join(BASE_DIR, "data", "processed", "recipes_clean.csv")
KNOWN_CSV = os.path.join(BASE_DIR, "data", "processed", "known_ingredients.csv")

os.makedirs(DB_DIR, exist_ok=True)

recipes_df = pd.read_csv(RECIPES_CSV)
known_df = pd.read_csv(KNOWN_CSV)

if "ingredient_name" not in known_df.columns:
    first_col = known_df.columns[0]
    known_df = known_df.rename(columns={first_col: "ingredient_name"})

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    minutes INTEGER,
    n_ingredients INTEGER,
    ingredients_clean TEXT,
    steps_clean TEXT,
    calories REAL,
    total_fat REAL,
    sugar REAL,
    sodium REAL,
    protein REAL,
    saturated_fat REAL,
    carbohydrates REAL
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS known_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_name TEXT UNIQUE NOT NULL,
    category TEXT
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS receipt_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_filename TEXT,
    receipt_path TEXT,
    name TEXT NOT NULL,
    qty TEXT,
    price REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS fridge_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    quantity REAL DEFAULT 1,
    unit TEXT,
    price REAL,
    expiry_date TEXT,
    source TEXT DEFAULT 'receipt',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT 1,
    preference_key TEXT NOT NULL,
    preference_value TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS user_favourites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT 1,
    recipe_id INTEGER,
    recipe_name TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS shopping_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    quantity REAL DEFAULT 1,
    unit TEXT,
    estimated_price REAL,
    checked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS meal_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER,
    recipe_name TEXT,
    eaten_quantity REAL DEFAULT 1,
    calories REAL,
    protein REAL,
    carbs REAL,
    fat REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
""")

cursor.execute("DELETE FROM recipes")
cursor.execute("DELETE FROM known_ingredients")

recipes_df.to_sql("recipes", conn, if_exists="append", index=False)

if "category" in known_df.columns:
    known_df[["ingredient_name", "category"]].drop_duplicates().to_sql(
        "known_ingredients",
        conn,
        if_exists="append",
        index=False
    )
else:
    known_df[["ingredient_name"]].drop_duplicates().to_sql(
        "known_ingredients",
        conn,
        if_exists="append",
        index=False
    )

conn.commit()
conn.close()

print("Database created and loaded successfully.")
print("DB:", DB_PATH)
print("Recipes:", len(recipes_df))
print("Known ingredients:", len(known_df))
print("Tables created:")
print("- recipes")
print("- known_ingredients")
print("- receipt_items")
print("- fridge_items")
print("- user_preferences")
print("- user_favourites")
print("- shopping_list")
print("- meal_logs")