# Meal Plan Module Changelog

All notable changes to the `backend/modules/meal_plan` module are documented here.
Follows semantic versioning as defined in the root README.

---

## [1.4.0] — 2026-04-24

### Added — `GET /api/meals/search` typeahead endpoint

Powers the TopNav recipe search bar.

- Query params: `q` (required, minimum 2 characters; shorter returns empty), `limit` (default 8, clamped to [1, 20]).
- Case-insensitive substring match on `recipes.name` via `ILIKE '%q%'`.
- **Prefix-first ranking**: matches where the name starts with `q` rank above `contains` matches. Within each tier, stable alphabetical order on `LOWER(name)`. Typing "coco" surfaces "coconut curry" before "chocolate coconut cake", which is what users expect from typeahead.
- Returns a compact shape: `{ id, name, calories, minutes, match_type: 'prefix' | 'contains' }`. Clients fetch full recipe records via the existing recommendations / favourites endpoints when they need more than a name and id to route to the right card.

### Notes for maintainers

- No index was added for this query. At the current ~20k recipe count, `ILIKE '%q%'` with the rank CASE runs in well under 50 ms. If the dataset ever grows by 10×, add a `pg_trgm` GIN index on `LOWER(name)` and convert the query to use `%>` similarity. Don't pre-optimise.
- The 2-character minimum is enforced server-side (short queries return `[]`), but the frontend debounces and gates on the same threshold anyway. Belt and braces: defence against a rogue caller hammering the endpoint with single-character probes.

---

## [1.3.0] — 2026-04-23

### Added — Pixabay-backed recipe hero photos

**New file:** `backend/modules/meal_plan/image_service.py` — self-contained
Pixabay client + local byte cache.

- **`GET /api/meals/recipe-image/<int:recipe_id>`** serves a cached recipe
  hero photo, or 404 if no image is available. The frontend treats 404 as
  "render the gradient + category-icon hero" so no broken-image placeholders
  are ever shown.
- On cache miss the endpoint synchronously:
  1. Reads the recipe name from `recipes.name`.
  2. Cleans the name into a concise Pixabay query via `_clean_query()` —
     drops filler words (`a`, `the`, `quick`, `easy`, `best`, `original`,
     `mom(s)`, `dad(s)`, etc.) and single-letter tokens (so `J W S Quick Coq
     Au Vin` → `coq au vin`), then keeps the first four content words.
  3. Hits Pixabay with `image_type=photo`, `category=food`, `safesearch=true`,
     `orientation=horizontal`, `per_page=3` (Pixabay's minimum).
  4. Downloads the first hit's `webformatURL` bytes to
     `backend/data/recipe-covers/<recipe_id>.jpg`.
  5. Inserts a row in the new `recipe_images` table (see below).
- **Known-negative caching.** When Pixabay returns zero hits or the download
  fails, a row is still inserted with `image_filename = NULL`. Subsequent
  requests for the same recipe 404 immediately without re-querying Pixabay,
  so the API key's 100-req/60-s budget is not burned on recipes with
  unsearchable names like `smurf juice`.
- **TOS compliance.** Pixabay's API terms forbid permanent hotlinking and
  their `webformatURL` values expire in 24 hours, so we download the bytes
  and serve them from our own origin. Attribution metadata (`pixabay_id`,
  `pixabay_user`, `pixabay_user_id`, `pixabay_page_url`) is persisted with
  each row for credit + debugging, though the current frontend only
  surfaces a page-level "Recipe photos from Pixabay" line.

**New table:** `recipe_images`, lazily created via the project's existing
`CREATE TABLE IF NOT EXISTS` + `_TABLE_INITIALISED` idiom (same pattern as
`user_budget` and `user_preferences` in the profile module):

```
recipe_id        INTEGER PRIMARY KEY
image_filename   TEXT        -- NULL = known-negative
pixabay_id       BIGINT
pixabay_user     TEXT
pixabay_user_id  BIGINT
pixabay_page_url TEXT
fetched_at       TIMESTAMP   -- default CURRENT_TIMESTAMP
```

### Added — `PIXABAY_API_KEY` environment variable

- Added to `backend/.env.example` with a comment pointing at
  `https://pixabay.com/api/docs/` and documenting the graceful-degradation
  behaviour when the key is unset.
- Read at call time via `os.environ.get("PIXABAY_API_KEY")`, not via
  `core/config.py` — the image service treats a missing key as "feature
  disabled" rather than "misconfiguration", which means the app still boots
  cleanly on developer machines without the key.
- Image cache dir (`backend/data/recipe-covers/`) added to root `.gitignore`
  so downloaded photos stay local and rebuild organically across machines.

### Notes

- **Stdlib-only networking.** `urllib.request` for both the search call and
  the image download (4 s and 6 s timeouts respectively). No new pip
  dependency; the project's `requirements.txt` is untouched.
- **User-Agent is mandatory on the download path.** Pixabay's image CDN
  (not the API itself — only the `*.pixabay.com/get/*` hosts) returns
  HTTP 403 Forbidden to the default `Python-urllib/*` User-Agent. Every
  download request therefore carries an explicit
  `User-Agent: TrolleyForTomorrow/1.0 (+https://pixabay.com/api/docs/)`
  header. Without this every recipe ends up with a persisted
  known-negative row even though the search itself succeeded — the
  specific failure mode seen during initial integration testing.
- **Concurrency.** Flask dev server serialises requests, so a 20-card page
  load makes 20 sequential Pixabay calls worst-case — well inside the
  100-req/60-s limit. Under gunicorn with multiple workers, two simultaneous
  requests for the same recipe could race: both call Pixabay and attempt to
  write the same file. The file write is effectively idempotent (identical
  bytes), and the DB insert uses `ON CONFLICT (recipe_id) DO UPDATE` so the
  race is harmless — worst case is one extra Pixabay call.
- **Search quality is the irreducible limitation.** Pixabay has stock food
  photography, not recipe photography. Expect ~30–40 % of recipes to return
  zero food-category hits (graceful fallback kicks in) and another chunk to
  return tangentially-related photos. No amount of query cleaning fixes
  this — it's a corpus mismatch, not a heuristic problem.
- **Rate-limit failure is transient.** Pixabay 429 responses are caught as
  "no hit" and — critically — *not* persisted as known-negatives, so a
  rate-limited window doesn't permanently disable images for the affected
  recipes. The next request after the 60-s window re-attempts cleanly.

---

## [1.2.0] — 2026-04-23

### Added

- **`highest_calories` sort key** on `GET /api/meals/recommendations?sort=`. Inverse pair to the existing `lowest_calories`. Sorts by `-calories` with the usual `-match_score`, `name` tiebreakers; recipes with NULL `calories` land at the end.

### Removed

- **`quickest` and `fewest_missing` sort keys** dropped from `SORT_KEYS`. Product call:
  - `fewest_missing` duplicated the default `match` ordering (which already ranks by `match_count / total_ingredients`) *and* partially shadowed the `strict_only=true` filter — three mechanisms pointing at one fridge-completion dimension.
  - `quickest` dropped by product call to keep the dropdown tight (minutes-based ranking was rarely picked in user testing).

  Requests with the retired keys fall back to `match` via the existing `if sort_key not in SORT_KEYS` guard, so any stale frontend, bookmark, or cached client keeps working — it just sees the default ordering.

### Notes

- Final sort set is now: `match` (default), `highest_protein`, `lowest_calories`, `highest_calories`.
- Frontend `SORT_OPTIONS` in `frontend/src/modules/meals/MealsPage.jsx` must stay in sync with this set.

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
