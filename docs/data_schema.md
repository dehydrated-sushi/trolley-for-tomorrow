# Data Schema

Checked against the live PostgreSQL database on 2026-04-28 and cross-checked
against the backend setup scripts in this repo.

## How to Inspect the App Schema

The psql command `\d *.*` expands across every schema, so it mostly prints
PostgreSQL system and `information_schema` objects. Use the app schema instead:

```sql
\dt public.*
\d public.recipes
\d public.receipt_items
```

For a compact SQL view:

```sql
SELECT table_schema, table_name, table_type
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;
```

## Live PostgreSQL Tables

All current app tables are in the `public` schema.

| Table | Purpose | Current rows checked |
| --- | --- | ---: |
| `recipes` | Main recipe catalogue used by recommendations and search. | 231,636 |
| `known_ingredients` | Ingredient lookup used for matching and category fallback. | 14,851 |
| `receipts` | One row per receipt scan/upload session. | 1 |
| `receipt_items` | Parsed receipt items and manual fridge entries. | 11 |
| `fridge_items` | Older/separate fridge table; current fridge routes mainly use `receipt_items`. | Not counted |
| `shopping_list` | Persisted shopping-list items. | Not counted |
| `meal_logs` | Logged eaten meals and nutrition totals. | Not counted |
| `user_budget` | Single demo user's weekly budget. | Not counted |
| `user_preferences` | Single demo user's dietary flags. | Not counted |
| `user_favourites` | Favourite recipe links. | Not counted |
| `recipe_images` | Cached recipe image metadata from Pixabay lookups. | Not counted |
| `users` | Auth/profile-era table present in the DB, but not currently defined by the repo's auth module. | Not counted |

## Core Tables

### `recipes`

Primary key: `id`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer | Primary key from the recipe dataset. |
| `name` | text | Required. |
| `minutes` | integer | Cooking time. |
| `n_ingredients` | integer | Ingredient count. |
| `ingredients_clean` | text | Pipe-separated ingredient names. |
| `steps_clean` | text | Pipe-separated recipe steps. |
| `calories` | double precision | Nutrition field. |
| `total_fat` | double precision | Nutrition field. |
| `sugar` | double precision | Nutrition field. |
| `sodium` | double precision | Nutrition field. |
| `protein` | double precision | Nutrition field. |
| `saturated_fat` | double precision | Nutrition field. |
| `carbohydrates` | double precision | Nutrition field. |

### `known_ingredients`

Primary key: `id`

Unique constraint: `ingredient_name`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer | Auto-incrementing primary key. |
| `ingredient_name` | text | Required, unique, lower-cased by the loader. |
| `category` | text | Optional category/classifier label. |

### `receipts`

Primary key: `id`

| Column | Type | Default |
| --- | --- | --- |
| `id` | integer | auto-increment |
| `user_id` | integer | `1` |
| `original_filename` | text | required |
| `stored_file_path` | text |  |
| `scan_source` | text | `'upload'` |
| `store_name` | text |  |
| `purchase_date` | date |  |
| `scan_status` | text | `'uploaded'` |
| `raw_ocr_text` | text |  |
| `parser_version` | text |  |
| `item_count` | integer | `0` |
| `total_amount` | double precision |  |
| `created_at` | timestamp | `CURRENT_TIMESTAMP` |
| `updated_at` | timestamp | `CURRENT_TIMESTAMP` |

### `receipt_items`

Primary key: `id`

Foreign key: `receipt_id -> receipts.id`

Index: `idx_receipt_items_receipt_id`

| Column | Type | Default |
| --- | --- | --- |
| `id` | integer | auto-increment |
| `receipt_filename` | text |  |
| `receipt_path` | text |  |
| `name` | text | required |
| `qty` | text |  |
| `price` | double precision |  |
| `created_at` | timestamp | `CURRENT_TIMESTAMP` |
| `receipt_id` | integer |  |
| `matched_name` | text |  |
| `match_score` | double precision |  |
| `expiry_date` | date |  |

Current fridge routes use this table as the virtual fridge. Manual fridge
entries are inserted here with sentinel receipt file/path values.

Expiry dates are now connected to the processed data layer. When an item is
saved without a user-entered `expiry_date`, the backend estimates one from
`backend/data/processed/food_reference.csv` using the FoodKeeper refrigerated
storage window. If no reference match is available, it falls back to the
nutrition classifier category, for example protein, vegetables, fruits, grains,
fats, beverages, or other.

### `fridge_items`

Primary key: `id`

| Column | Type | Default |
| --- | --- | --- |
| `id` | integer | auto-increment |
| `name` | text | required |
| `category` | text |  |
| `quantity` | double precision | `1` |
| `unit` | text |  |
| `price` | double precision |  |
| `expiry_date` | date |  |
| `source` | text | `'receipt'` |
| `created_at` | timestamp | `CURRENT_TIMESTAMP` |

This table exists, but the current fridge API reads and writes `receipt_items`.

### `shopping_list`

Primary key: `id`

| Column | Type | Default |
| --- | --- | --- |
| `id` | integer | auto-increment |
| `name` | text | required |
| `category` | text |  |
| `quantity` | double precision | `1` |
| `unit` | text |  |
| `estimated_price` | double precision |  |
| `checked` | boolean | `false` |
| `created_at` | timestamp | `CURRENT_TIMESTAMP` |

### `meal_logs`

Primary key: `id`

| Column | Type | Default |
| --- | --- | --- |
| `id` | integer | auto-increment |
| `recipe_id` | integer |  |
| `recipe_name` | text |  |
| `eaten_quantity` | double precision | `1` |
| `calories` | double precision |  |
| `protein` | double precision |  |
| `carbs` | double precision |  |
| `fat` | double precision |  |
| `created_at` | timestamp | `CURRENT_TIMESTAMP` |

## Profile and User Tables

### `user_budget`

Primary key: `id`

| Column | Type | Default |
| --- | --- | --- |
| `id` | integer | required |
| `weekly_budget` | real | required |
| `updated_at` | timestamp | `CURRENT_TIMESTAMP` |

### `user_preferences`

Primary key: `id`

| Column | Type | Default |
| --- | --- | --- |
| `id` | integer | required |
| `vegetarian` | boolean | `false` |
| `vegan` | boolean | `false` |
| `pescatarian` | boolean | `false` |
| `gluten_free` | boolean | `false` |
| `dairy_free` | boolean | `false` |
| `nut_free` | boolean | `false` |
| `updated_at` | timestamp | `CURRENT_TIMESTAMP` |

`backend/scripts/init_postgres_db.py` still creates an older key/value version
of this table, but `backend/modules/profile/routes.py` migrates it to these
boolean columns on first profile request.

### `user_favourites`

Live DB primary key: `id`

| Column | Type | Default |
| --- | --- | --- |
| `id` | integer | auto-increment |
| `user_id` | integer | `1` |
| `recipe_id` | integer |  |
| `recipe_name` | text |  |
| `created_at` | timestamp | `CURRENT_TIMESTAMP` |

The current profile route expects a uniqueness rule on `(user_id, recipe_id)`
for `ON CONFLICT (user_id, recipe_id) DO NOTHING`, but the live table currently
only has `id` as the primary key. Add a unique index before relying on the
idempotent favourite endpoint:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS user_favourites_user_recipe_key
ON public.user_favourites (user_id, recipe_id);
```

### `users`

Primary key: `user_id`

Unique constraint: `email`

| Column | Type | Default |
| --- | --- | --- |
| `user_id` | integer | auto-increment |
| `name` | varchar |  |
| `email` | varchar | required |
| `password_hash` | text |  |
| `age` | integer |  |
| `height` | numeric |  |
| `weight` | numeric |  |
| `weekly_budget` | numeric |  |
| `household_size` | integer |  |
| `dietary_flags` | integer | `0` |
| `created_at` | timestamp | `CURRENT_TIMESTAMP` |
| `updated_at` | timestamp | `CURRENT_TIMESTAMP` |

This table is present in Postgres, but the repo's current
`backend/modules/auth/*` files are empty.

## Recipe Images

### `recipe_images`

Primary key: `recipe_id`

| Column | Type | Default |
| --- | --- | --- |
| `recipe_id` | integer | required |
| `image_filename` | text |  |
| `pixabay_id` | bigint |  |
| `pixabay_user` | text |  |
| `pixabay_user_id` | bigint |  |
| `pixabay_page_url` | text |  |
| `fetched_at` | timestamp | `CURRENT_TIMESTAMP` |

Defined lazily by `backend/modules/meal_plan/image_service.py`.

## `food_reference.csv` Data Process

`food_reference.csv` is not currently a PostgreSQL table. It is a processed CSV
artifact at:

```text
backend/data/processed/food_reference.csv
```

It is built by:

```bash
python data/pipelines/build_food_reference.py
```

Inputs:

| Input | Default path |
| --- | --- |
| AFCD Release 3 nutrient profiles | `/Users/arsh/Desktop/data/AFCD Release 3 - Nutrient profiles.xlsx` |
| ABS CPI Australia workbook | `/Users/arsh/Desktop/data/CPI-Australia/640103.xlsx` |
| FoodKeeper JSON | `data/processed/foodkeeper.json` |
| Known ingredients | `backend/data/processed/known_ingredients.csv` |

Outputs:

| Output | Rows checked | Purpose |
| --- | ---: | --- |
| `afcd_nutrition_clean.csv` | 1,801 | Nutrition rows from AFCD solids/liquids sheets. |
| `cpi_food_indexes.csv` | 7,109 | Australia food CPI category index history. |
| `expiry_reference.csv` | 661 | FoodKeeper product storage windows converted to days. |
| `ingredient_expiry_matches.csv` | 3,500 | Known ingredients matched to FoodKeeper products. |
| `food_reference.csv` | 14,851 | One joined reference row per known ingredient. |

`food_reference.csv` columns:

```text
ingredient_name, canonical_name, afcd_food_key, afcd_food_name,
afcd_match_score, nutrition_basis, energy_kj, energy_kcal, protein_g,
fat_total_g, carbohydrates_g, sugars_g, fibre_g, sodium_mg, cpi_category,
latest_cpi_period, latest_cpi_index, cpi_monthly_pct_change,
cpi_annual_pct_change, foodkeeper_product_id, foodkeeper_name,
foodkeeper_subtitle, expiry_match_score, pantry_min_days, pantry_max_days,
refrigerate_min_days, refrigerate_max_days, freeze_min_days, freeze_max_days
```

Pipeline logic:

1. Read `known_ingredients.csv` and de-duplicate by lower-cased ingredient name.
2. Load AFCD nutrition from the per-100g and per-100mL sheets, clean headers,
   calculate kcal from kJ, and make normalized match keys.
3. Load CPI index-number series for Australia, then keep latest monthly and
   annual percentage-change signals by food category.
4. Flatten FoodKeeper JSON into expiry reference rows and normalize pantry,
   fridge, and freezer windows into days.
5. Build FoodKeeper aliases from product names, subtitles, combined names, and
   keywords.
6. Match known ingredients to FoodKeeper aliases using exact, phrase, and token
   overlap scoring.
7. Match known ingredients to AFCD nutrition rows using token overlap.
8. Infer a CPI category from ingredient keywords.
9. Write one joined `food_reference.csv` row per known ingredient.

Current coverage in `food_reference.csv`:

| Field family | Matched rows | Coverage |
| --- | ---: | ---: |
| AFCD nutrition key | 5,359 | 36.1% |
| CPI latest period | 14,851 | 100.0% |
| FoodKeeper product | 3,500 | 23.6% |
| Pantry max days | 1,707 | 11.5% |
| Refrigerate max days | 1,613 | 10.9% |
| Freeze max days | 1,657 | 11.2% |

## Notes for Tomorrow

- Use `\dt public.*` or targeted `\d public.<table>` commands in psql.
- `food_reference.csv` is ready as a reference artifact, but no loader/table
  exists yet for it in Postgres.
- `receipt_items` currently carries both receipt OCR items and manual fridge
  entries; `fridge_items` is present but mostly unused.
- `user_favourites` needs a `(user_id, recipe_id)` unique index if the current
  favourite endpoint is used as written.
- The local Python environment used for this check did not have `openpyxl`
  installed, so the combined pipeline failed there until requirements are
  installed. `backend/requirements.txt` already includes `openpyxl==3.1.5`.
