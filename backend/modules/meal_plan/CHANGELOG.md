# Meal Plan Module Changelog

All notable changes to the `backend/modules/meal_plan` module are documented here.
Follows semantic versioning as defined in the root README.

---

## [1.1.0] — 2026-04-23

### Added

- **Three additional nutrition columns in the recommendation response**: `total_fat`, `saturated_fat`, `sodium`. Sourced directly from the `recipes` table (non-null across all 231,636 rows) and stored as **% Daily Value**, matching the existing `protein`, `carbohydrates`, and `sugar` fields. Added to both the `SELECT` in `/api/meals/recommendations` and to each dict in `recommendations[]`.
- Required by the new frontend `NutritionPopover`, which converts %DV back to grams (FDA reference amounts) and computes kcal per macro.

### Notes

- No schema migration required — the columns already exist on `recipes`.
- `calories` remains the only raw-kcal field in the response; every other nutrition field (now seven total) is %DV.
- **Deployment gotcha observed during 1.0.0 → 1.1.0 iteration:** a Flask process started before the 1.0.0 sort-param changes continued serving responses without `sort`, `strict_count`, or `one_missing_count`, which silently broke the frontend sort dropdown. Running with `FLASK_ENV=development` enables Werkzeug's auto-reloader; otherwise the process must be killed and restarted after any `routes.py` edit.

---

## [1.0.0] — 2026-04-23

First tracked release of the meal plan module at module level. Prior work on
`/api/meals/recommendations` and `/api/meals/tags` was covered in top-level
changelogs only. This entry records the recommendation-quality refactor: 40%
match floor, sort parameter, and count summaries that power the frontend's
informative recommendations header.

### Added

- **`?sort=` query parameter** on `GET /api/meals/recommendations`. Accepts
  one of five keys, listed in the new module constant `SORT_KEYS`:
  - `match` (default, current ranking by match score)
  - `quickest` — ascending by `recipes.minutes`
  - `fewest_missing` — ascending by `total_ingredients - match_count`
  - `highest_protein` — descending by `recipes.protein`
  - `lowest_calories` — ascending by `recipes.calories`

  All sort comparators use falsy-safe fallbacks so recipes with a NULL value
  for the sort column land at the end (for descending sorts) or start (for
  ascending sorts). Invalid values for `sort` silently coerce to `match`.
- **Two new count fields in the response** powering the frontend's
  informative header copy:
  - `strict_count` — number of recipes where `match_count == total_ingredients`
  - `one_missing_count` — number of recipes where `total_ingredients - match_count == 1`
  
  Both are computed from the filtered recipe list and included even when the
  response has no items (the empty-fridge shortcut path).
- **`MIN_MATCH_RATIO = 0.4`** module constant — the minimum fraction of a
  recipe's ingredients that must be in the user's fridge for the recipe to
  appear in the recommendation list.

### Changed

- **Recommendation minimum match ratio raised to 40 %.** Previously any
  recipe with two or more ingredients in the fridge qualified, which
  produced lists as long as ~3,800 recipes (193 pages at 20 per page) and
  surfaced sparse partial matches (2 of 15 ingredients) as "recommendations".
  New logic keeps the `match_count >= 2` floor AND adds the 40 % ratio
  floor. `strict_only=true` still requires 100 %.
- `base_response` includes `sort`, `strict_count`, and `one_missing_count`
  defaults so empty-fridge / empty-match responses have a stable shape.

### Notes

- Every recipe in the database (231,636 rows) has non-null values for all
  seven nutrition columns: `calories`, `protein`, `carbohydrates`, `sugar`,
  `total_fat`, `saturated_fat`, `sodium`. Tag thresholds
  (`high_protein >= 25`, `low_carb < 20`, `sweet > 25`) use these columns
  directly. Sample inspection suggests the values are **% of Daily Value**
  rather than grams — only `calories` looks like a raw kcal figure. Any
  consumer displaying nutrition values verbatim must label the unit as
  `%DV`, not `g`, to avoid misleading users.
- Sort order ties within each sort key are broken by match score then name,
  so the list remains stable and deterministic regardless of the chosen
  sort.
- `LIMIT 8000` on the SQL pre-filter has been kept — the leading-wildcard
  `LIKE '%item%'` on `ingredients_clean` cannot use indexes, and the cap
  keeps response time under 2 s even on large fridges.
