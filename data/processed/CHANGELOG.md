# Processed Data Changelog

All notable additions and changes to files under `data/processed/`.

---

## [1.0.0] — 2026-04-23

### Added

- `foodkeeper.json` — USDA FSIS FoodKeeper dataset version 128 (released 2018-09-06), converted from the original Excel `FMA-Data-v128.xlsx` distribution into JSON for repo storage. Consumed by `backend/scripts/seed_foodkeeper.py` → the four `foodkeeper_*` Postgres tables → the `/api/foodkeeper/*` endpoints → the Dashboard Trolley Tips widget.
  - Source: https://catalog.data.gov/dataset/fsis-foodkeeper-data
  - Licence: public domain (U.S. government work)
  - Shape: an object with a `sheets` array, each sheet being `{ name, data, maxRows, maxCols }`. The `data` array is itself a list of rows, and each row is a list-of-single-key-dicts (an Excel exporter artefact). The seed script flattens each row into a normal dict before processing.
  - Known quirks carried over from the source: mojibake in text fields (`Ã©` / `â` from a Latin-1 ↔ UTF-8 double-encoding); float IDs (`34.0` instead of `34`); sparse rows (many products have only one of pantry/refrigerate/freeze populated); duplicate tip bodies across related products. All repaired or filtered at seed time.
