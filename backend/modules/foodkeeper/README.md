# FoodKeeper Module

Read-only REST endpoints backing the USDA FSIS FoodKeeper dataset — 25 categories, ~680 products with storage times, and ~90 cooking-method/tip records.

## Source

- Dataset: **USDA FSIS FoodKeeper Data, version 128** (released 2018-09-06)
- URL: https://catalog.data.gov/dataset/fsis-foodkeeper-data
- Licence: public domain (U.S. government work)
- Original format: Excel (`FMA-Data-v128.xlsx`), converted to JSON for repo storage

## Why it's here

The FoodKeeper data is the authoritative public-domain reference for food safety storage times in the US. We use it for:

1. **Dashboard Trolley Tips** — random conversational tips filtered from the data, with USDA attribution. Current consumer.
2. **Fridge expiry estimates** *(future)* — show "lettuce: 7-10 days refrigerated" per item.
3. **Recipe cooking reference** *(future)* — show safe minimum temperatures on recipe cards.

## Tables

All four tables are created and populated by `backend/scripts/seed_foodkeeper.py`. Nothing else in the app writes to them.

| Table | Rows | Purpose |
|---|---|---|
| `foodkeeper_categories` | 25 | Food categories (Meat, Dairy, Produce, …) + subcategories |
| `foodkeeper_products` | ~680 | Per-product storage times: pantry / refrigerate / freeze, plus "after opening" and "from date of purchase" variants |
| `foodkeeper_cooking_tips` | ~90 | Safe minimum temperatures, rest times, conversational cooking tips |
| `foodkeeper_cooking_methods` | ~90 | Cooking method × weight × temperature × time matrix |

## Endpoints

All responses include an `attribution` block so the consumer can credit USDA:

```json
{
  "source":  "USDA FSIS FoodKeeper Data",
  "version": "128 (2018-09-06)",
  "url":     "https://catalog.data.gov/dataset/fsis-foodkeeper-data",
  "licence": "Public domain (U.S. government work)"
}
```

### `GET /api/foodkeeper/tips?limit=N`

Random, deduplicated, tone-filtered tips. `limit` clamped to `[1, 20]`, default 1.

**Tone filter**: body ≥ 40 chars AND ends with `.`, `!`, or `?`. Deduped by lowercased-trimmed body (so the generic "Braising is …" tip attached to 40+ meat products only surfaces once).

Draws from five sources: `pantry_tips`, `refrigerate_tips`, `freeze_tips`, `dop_pantry_tips` on products, plus `tips` on `foodkeeper_cooking_tips`.

### `GET /api/foodkeeper/products?q=<term>&limit=N`

Keyword search over `name`, `name_subtitle`, `keywords`. `limit` clamped to `[1, 100]`, default 20. Results ranked by exact-match → prefix-match → contains-match.

### `GET /api/foodkeeper/products/<int:id>`

Full product record joined with its cooking tips and cooking methods. 404 if the ID doesn't exist.

### `GET /api/foodkeeper/categories`

All 25 categories, flat list.

### `GET /api/foodkeeper/attribution`

Attribution block on its own, for UI chrome that doesn't want to make a data-bearing call.

## Empty-database behaviour

Every endpoint probes for table existence on the first query and returns an empty payload (with the attribution block) instead of a 500 if the tables aren't there yet. The Dashboard Tips widget shows its fallback copy in that case. This means the feature can ship before the seed has been run on a given database without breaking the app.

## Seeding

```bash
cd backend
python scripts/seed_foodkeeper.py           # uses data/processed/foodkeeper.json by default
python scripts/seed_foodkeeper.py /other/path/to.json
FOODKEEPER_JSON_PATH=/path/to.json python scripts/seed_foodkeeper.py
```

Idempotent — drops and recreates the four tables. Fixes the mojibake (`Ã©`/`â`-style artefacts from the original Excel export's UTF-8 misdecoding) by running each text field through a Latin-1-to-UTF-8 roundtrip, gated on actually-reducing-the-count-of-suspicious-chars so clean strings pass through untouched.

The RDS database is shared across the team, so seeding from one machine populates it for everyone. **Run this once after merging the feature; subsequent deployments don't need a re-seed.**

## Gotchas worth knowing

- **Mojibake**: the source JSON has `Ã©`, `â`, `â`-style characters from a Latin-1↔UTF-8 double-encoding somewhere in the Excel export. The seed script repairs these before insert. If you edit the source JSON by hand, re-seed.
- **Sparse rows**: many products have only one of pantry/refrigerate/freeze populated. SQL queries must tolerate nulls; the tips endpoint's `IS NOT NULL` filter handles this.
- **Duplicate tips text**: the source data repeats identical cooking tips across many related products (e.g., ~40 meat products share one "Braising is …" tip). The tips endpoint dedupes by body text.
- **Product ID gaps**: IDs in the source are non-contiguous (missing 18, 19, 62, 68, 80, 99, 100, 101, 122, 124, 137–139, 189, …). Don't assume contiguity.
- **Category subcategories are sparse**: only "Baked Goods", "Meat", "Poultry", "Produce", "Seafood" have subcategories; the rest have `subcategory_name = NULL`.
