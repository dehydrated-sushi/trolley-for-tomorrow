import sqlite3
import csv

DB_PATH = "/Users/saubhagya/Projects/FIT5120/New/backend/instance/food_app.db"

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row

# Export recipes
cursor = conn.execute("SELECT * FROM recipes")
rows = cursor.fetchall()
columns = [desc[0] for desc in cursor.description]

with open("/tmp/recipes.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(columns)
    writer.writerows(rows)

print(f"recipes: {len(rows)} rows exported to /tmp/recipes.csv")

# Export known_ingredients
cursor = conn.execute("SELECT * FROM known_ingredients")
rows = cursor.fetchall()
columns = [desc[0] for desc in cursor.description]

with open("/tmp/known_ingredients.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(columns)
    writer.writerows(rows)

print(f"known_ingredients: {len(rows)} rows exported to /tmp/known_ingredients.csv")

conn.close()
