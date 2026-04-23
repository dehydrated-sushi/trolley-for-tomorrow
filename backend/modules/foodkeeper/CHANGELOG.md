# FoodKeeper Module Changelog

All notable changes to `backend/modules/foodkeeper` are documented here.
Follows semantic versioning as defined in the root README.

---

## [1.0.0] — 2026-04-23

First release. Integrates the USDA FSIS FoodKeeper dataset into the Flask API for use by the Dashboard Trolley Tips widget, with hooks for future Fridge-page expiry estimates and Meals-page cooking references.

### Added

- **Four Postgres tables** created by `backend/scripts/seed_foodkeeper.py`:
  - `foodkeeper_categories` (25 rows)
  - `foodkeeper_products` (~680 rows) — per-product pantry/refrigerate/freeze times, plus after-opening and date-of-purchase variants
  - `foodkeeper_cooking_tips` (~90 rows) — safe minimum temperatures, rest times, textual tips
  - `foodkeeper_cooking_methods` (~90 rows) — cooking-method × weight × temp × timing matrix
- **Seed script** `backend/scripts/seed_foodkeeper.py`:
  - Loads `data/processed/foodkeeper.json` (configurable via CLI arg or `FOODKEEPER_JSON_PATH`).
  - Idempotent — DROPs and re-creates the four tables, repopulates.
  - Repairs mojibake in text fields (Latin-1-interpreted-as-UTF-8 roundtrip, conditional on actually reducing the suspicious-char count so clean strings pass through untouched).
  - Flattens the source JSON's array-of-singleton-dicts row shape (an Excel-exporter artefact) before processing.
  - Skips rows with null/empty primary keys and orphaned cooking-tips / cooking-methods rows.
- **REST endpoints** under `/api/foodkeeper/`:
  - `GET /tips?limit=N` — random deduplicated tips, filtered to body ≥ 40 chars ending in sentence punctuation. Default limit 1, clamped [1, 20]. Draws from five source columns.
  - `GET /products?q=<term>&limit=N` — keyword search over name, subtitle, and the comma-separated `keywords` column. Ranked exact → prefix → contains.
  - `GET /products/<int:id>` — full product record joined with its cooking tips and methods.
  - `GET /categories` — flat list of all 25 categories.
  - `GET /attribution` — stand-alone attribution block for UI chrome.
- **Graceful empty-database path**: every endpoint probes `foodkeeper_products` with `SELECT 1 LIMIT 1` first and returns an empty-but-valid payload (with attribution) instead of a 500 if the seed hasn't been run against the target database.

### Attribution

All data originates from the USDA Food Safety and Inspection Service (FSIS) FoodKeeper dataset, version 128 (2018-09-06), distributed under the data.gov public-domain U.S. government work licence. Attribution block is surfaced by every endpoint and rendered as a source link under the Dashboard Trolley Tips card:

- Source: USDA FSIS FoodKeeper Data
- URL: https://catalog.data.gov/dataset/fsis-foodkeeper-data
- Licence: Public domain (U.S. government work)

### Notes for maintainers

- **Blueprint auto-registration**: `app.py`'s `create_app()` uses `pkgutil.iter_modules` to auto-discover `modules/*/routes.py` with a `bp` attribute. No wiring required; dropping the module in is enough.
- **Werkzeug reloader does not pick up a brand-new module directory on its own** (it watches files it's already imported). After adding the module, either restart Flask or `touch` an already-watched file (e.g. `app.py`) to trigger a reload.
- **Shared database**: `backend/.env` points at the team's AWS RDS instance. Seeding from any one machine populates the four tables for the whole team — re-seeding on each deployment is not required. Re-seed only when `data/processed/foodkeeper.json` itself changes.
- **Indexes added**: `LOWER(name)`, `LOWER(keywords)`, and `category_id` on `foodkeeper_products`; `product_id` on the two dependent tables. Supports the keyword-search endpoint without scanning.
- **Tone filter**: the `/tips` endpoint uses a regex (`[.!?]\s*$`) plus length threshold to reject terse/technical entries. Conservative — real rejection rate is visible in a quick `SELECT COUNT(*) FROM foodkeeper_products WHERE pantry_tips IS NOT NULL` versus the resulting candidate count. Tune `_MIN_TIP_LENGTH` in `routes.py` if too many tips feel off-tone.
- **No writes from the main app**: the four tables are strictly read-only at request time. Only the seed script writes. Safe to `DROP CASCADE` on a re-seed.
