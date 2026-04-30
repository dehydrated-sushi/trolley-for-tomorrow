# Data Pipelines

These scripts turn raw local data files into backend-ready CSVs under
`backend/data/processed`.

## Current Pipelines

```bash
python data/pipelines/clean_nutrition.py
python data/pipelines/clean_pricing.py
python data/pipelines/clean_expiry.py
python data/pipelines/build_food_reference.py
python data/pipelines/clean_recipes.py
```

`build_food_reference.py` runs the combined pipeline and produces:

- `afcd_nutrition_clean.csv` from AFCD Release 3 nutrient profiles.
- `cpi_food_indexes.csv` from ABS CPI Australia table 3.
- `expiry_reference.csv` from FoodKeeper storage windows.
- `ingredient_expiry_matches.csv` from app known ingredients to FoodKeeper.
- `food_reference.csv`, one joined row per known ingredient with nutrition,
  CPI, and expiry fields.

`clean_recipes.py` produces recipe costing helpers from `recipes_clean.csv`:

- `recipe_portion_summary.csv`, one row per recipe with estimated one-portion
  total grams and calories.
- `recipe_portion_ingredients.csv`, one row per recipe ingredient with
  estimated grams per portion and a `price_lookup_key`.

The recipe source has ingredient names but not original quantities, so these
weights are estimates. The grams are category defaults scaled toward the
recipe calorie value and include confidence/source columns.

The default raw inputs are currently the files in `/Users/arsh/Desktop/data`.
Each script accepts CLI flags for alternate paths.
