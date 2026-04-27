# Data Pipeline Design

**Purpose:** create a repeatable pipeline that turns raw food, recipe, price, receipt, and store data into backend-ready tables for smarter recommendations, shopping lists, price estimates, and waste insights.

## Current State

- `data/pipelines/clean_nutrition.py`, `clean_pricing.py`, and `clean_recipes.py` exist but are empty.
- `backend/data/processed/recipes_clean.csv` is the main recipe source used by `backend/scripts/init_recipe_db.py` and `backend/scripts/init_postgres_db.py`.
- `backend/data/processed/known_ingredients.csv` contains ingredient names, with optional category support in the database loader.
- Runtime user data currently lives mostly in `receipt_items`; fridge, budget, meal recommendation, and shopping-list features reuse this table.
- Backend recipe recommendations currently depend on `recipes.ingredients_clean`, nutrition columns, and average item prices from `receipt_items`.

## Feature Goals

The next data pipeline should support:

- Current specials and lower-cost ingredient alternatives.
- Price estimates for shopping-list items and recipe recommendations.
- Better ingredient matching between recipes, receipts, and fridge entries.
- Dietary, nutrition, and affordability ranking.
- Waste and expiry insights once fridge item expiry data is available.

## Proposed Data Flow

```text
data/raw/
  recipes/
  nutrition/
  prices/
  specials/
  stores/
  receipt_exports/
      |
      v
data/pipelines/
  01_clean_recipes.py
  02_clean_ingredients.py
  03_clean_prices.py
  04_clean_specials.py
  05_build_feature_tables.py
      |
      v
data/processed/
  recipes_clean.csv
  ingredients_master.csv
  recipe_ingredients.csv
  ingredient_prices.csv
  store_specials.csv
  ingredient_substitutes.csv
  recipe_features.csv
      |
      v
backend database
  recipes
  known_ingredients
  ingredient_prices
  store_specials
  ingredient_substitutes
  recipe_features
```

## Processed Tables

### `recipes_clean.csv`

Keep the existing backend contract so current API routes continue working.

Required columns:

- `id`
- `name`
- `minutes`
- `n_ingredients`
- `ingredients_clean` pipe-separated ingredient names
- `steps_clean` pipe-separated recipe steps
- `calories`
- `total_fat`
- `sugar`
- `sodium`
- `protein`
- `saturated_fat`
- `carbohydrates`

### `ingredients_master.csv`

One normalised row per ingredient.

Columns:

- `ingredient_id`
- `ingredient_name`
- `canonical_name`
- `category`
- `diet_flags` such as `vegetarian`, `vegan`, `gluten_free`, `dairy_free`, `nut_free`
- `shelf_life_days`
- `common_unit`

### `recipe_ingredients.csv`

Bridge table that avoids repeatedly parsing `ingredients_clean`.

Columns:

- `recipe_id`
- `ingredient_id`
- `ingredient_name_raw`
- `canonical_name`
- `quantity`
- `unit`
- `optional`

### `ingredient_prices.csv`

Historical and estimated price lookup for affordability features.

Columns:

- `canonical_name`
- `store_name`
- `postcode`
- `unit`
- `unit_price`
- `package_price`
- `package_size`
- `source`
- `observed_at`
- `confidence`

### `store_specials.csv`

Current or recently scraped specials.

Columns:

- `canonical_name`
- `store_name`
- `postcode`
- `special_price`
- `regular_price`
- `discount_pct`
- `starts_at`
- `ends_at`
- `source_url`
- `confidence`

### `ingredient_substitutes.csv`

Cheaper or diet-compatible swaps.

Columns:

- `ingredient_id`
- `substitute_ingredient_id`
- `reason`
- `diet_compatible`
- `relative_cost`
- `confidence`

### `recipe_features.csv`

Precomputed ranking features for fast recommendations.

Columns:

- `recipe_id`
- `estimated_total_cost`
- `estimated_cost_per_serving`
- `protein_per_dollar`
- `calories_per_dollar`
- `specials_available_count`
- `missing_ingredient_count`
- `diet_tags`
- `nutrition_tags`
- `affordability_score`

## Pipeline Scripts

### `01_clean_recipes.py`

- Read raw recipe files.
- Standardise text casing, whitespace, punctuation, and pipe-separated fields.
- Drop duplicate recipe IDs.
- Validate required nutrition columns.
- Write `recipes_clean.csv`.

### `02_clean_ingredients.py`

- Extract ingredient names from recipes and known ingredient files.
- Normalise names into canonical names.
- Assign categories using the existing `modules.nutrition.classifier.classify` helper where possible.
- Add shelf-life and diet flags from lookup files.
- Write `ingredients_master.csv` and `recipe_ingredients.csv`.

### `03_clean_prices.py`

- Read receipt exports, manual price lookup files, and supermarket price files.
- Normalise products to canonical ingredient names.
- Convert package prices to comparable unit prices.
- Keep source and confidence fields because price data will be noisy.
- Write `ingredient_prices.csv`.

### `04_clean_specials.py`

- Read current specials files or API exports.
- Match special products to canonical ingredient names.
- Keep start/end dates so expired specials can be filtered.
- Write `store_specials.csv`.

### `05_build_feature_tables.py`

- Join recipes, recipe ingredients, prices, and specials.
- Estimate recipe cost using the best available price per ingredient.
- Compute affordability and nutrition features.
- Generate substitute suggestions for expensive or missing ingredients.
- Write `recipe_features.csv` and `ingredient_substitutes.csv`.

## Backend Changes Needed

- Add database tables for `ingredient_prices`, `store_specials`, `ingredient_substitutes`, and `recipe_features`.
- Update `backend/scripts/init_postgres_db.py` and `backend/scripts/init_recipe_db.py` to load the new processed CSVs.
- Keep existing `recipes` and `known_ingredients` columns stable so current pages do not break.
- Add APIs for:
  - recipe cost breakdown
  - specials-aware recommendations
  - cheaper substitutes
  - shopping-list price estimates
  - price confidence warnings when data is sparse

## Build Order

1. Fill `01_clean_recipes.py` and protect the current `recipes_clean.csv` contract.
2. Build `ingredients_master.csv` and `recipe_ingredients.csv`.
3. Add price ingestion from receipt history first, because the app already captures that data.
4. Add supermarket specials as a second price source.
5. Precompute `recipe_features.csv`.
6. Wire backend loaders and new recommendation endpoints.
7. Add tests for column validation, duplicate handling, ingredient matching, and cost calculations.

## Validation Rules

- Every processed CSV must fail loudly if required columns are missing.
- Recipe IDs must be unique.
- Canonical ingredient names must be lowercase and trimmed.
- Unit prices must be non-negative.
- Specials with `ends_at` before the current date must not be used in active recommendations.
- A recipe cost should include a `confidence` score based on how many ingredients have matched prices.

## Open Questions

- Which supermarket data source is available for tomorrow: manual CSV, scrape, API, or partner data?
- Do we want prices to be location-aware by postcode now, or keep location for a later iteration?
- Should manual fridge entries count toward budget spend, or only receipt-uploaded items?
- Do recipes have serving counts available anywhere, or should cost per serving use a default?
