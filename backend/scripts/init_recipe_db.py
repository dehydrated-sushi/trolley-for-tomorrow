import sqlite3
import pandas as pd
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_DIR = os.path.join(BASE_DIR, "database")
DB_PATH = os.path.join(DB_DIR, "food_app.db")
RECIPES_CSV = os.path.join(BASE_DIR, "data", "processed", "recipes_clean.csv")
KNOWN_CSV = os.path.join(BASE_DIR, "data", "processed", "known_ingredients.csv")

os.makedirs(DB_DIR, exist_ok=True)

recipes_df = pd.read_csv(RECIPES_CSV)
known_df = pd.read_csv(KNOWN_CSV)

# rename first column if needed so it matches your table
if "ingredient_name" not in known_df.columns:
    first_col = known_df.columns[0]
    known_df = known_df.rename(columns={first_col: "ingredient_name"})

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# create recipes table
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

# create known ingredients table
cursor.execute("""
CREATE TABLE IF NOT EXISTS known_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_name TEXT UNIQUE NOT NULL,
    category TEXT
)
""")

# create receipt items table
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

# clear old data only for seed tables
cursor.execute("DELETE FROM recipes")
cursor.execute("DELETE FROM known_ingredients")

# insert recipes
recipes_df.to_sql("recipes", conn, if_exists="append", index=False)

# insert known ingredients
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
print("Receipt table: receipt_items created")