"""Idempotent seed script for the FoodKeeper dataset.

Reads `data/processed/foodkeeper.json` (the USDA FSIS FoodKeeper data, version
128, from https://catalog.data.gov/dataset/fsis-foodkeeper-data), cleans up
the mojibake introduced by the original Excel → JSON export, casts the
Excel-style float IDs back to integers, and writes everything into four
Postgres tables: foodkeeper_categories, foodkeeper_products,
foodkeeper_cooking_tips, foodkeeper_cooking_methods.

Usage
-----
    cd backend
    python scripts/seed_foodkeeper.py
    # optional:
    python scripts/seed_foodkeeper.py /path/to/foodkeeper.json

Safe to re-run; DROPs the four tables and re-creates them. None of the app's
other modules write to these tables, so the drop is safe. After a successful
run, the Flask /api/foodkeeper/* endpoints start returning data — no restart
required.

Notes
-----
The JSON is a weird "array of single-key dicts" shape because the exporter
iterated row-by-row, column-by-column instead of building real dicts. We
flatten each row into a normal dict before processing.

Mojibake: every text field is run through `_repair_mojibake()`. The source
Excel export used MS Windows curly quotes and accented letters that, somewhere
in its travels, were interpreted as Latin-1 and then re-encoded as UTF-8 —
the classic `é → Ã©`, `â → â` pattern. We reverse that by encoding
to Latin-1 and decoding back as UTF-8, but only when we detect the pattern,
so clean strings pass through untouched.
"""

import json
import os
import sys
from pathlib import Path

# Make backend/ importable (run from anywhere).
_BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND_DIR))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(_BACKEND_DIR / ".env")

from app import app  # noqa: E402
from core.database import db  # noqa: E402
from sqlalchemy import text  # noqa: E402


# ---------------------------------------------------------------------------
# Value cleaners


def _repair_mojibake(s):
    """Fix Excel-export Latin-1-interpreted-as-UTF-8 double-encoding.

    Only attempts the repair if the input contains the telltale characters,
    and only keeps the result if it reduced the count of suspicious chars —
    protects clean strings from being mangled.
    """
    if not isinstance(s, str) or not s:
        return s
    if "Ã" not in s and "â" not in s:
        return s
    try:
        repaired = s.encode("latin-1", errors="ignore").decode("utf-8", errors="replace")
    except Exception:
        return s
    # Only accept the repair if it actually reduced the number of Ã and â.
    suspicious_before = s.count("Ã") + s.count("â")
    suspicious_after  = repaired.count("Ã") + repaired.count("â")
    return repaired if suspicious_after < suspicious_before else s


def _int(v):
    """Integer column — the JSON stores IDs as floats (e.g. 34.0). Accept
    floats, ints, None, or empty strings."""
    if v is None or v == "":
        return None
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def _float(v):
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _str(v):
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    return _repair_mojibake(s)


def _flatten_row(row):
    """The JSON rows are lists of single-key dicts — flatten to a plain dict."""
    merged = {}
    for cell in row:
        if isinstance(cell, dict):
            merged.update(cell)
    return merged


# ---------------------------------------------------------------------------
# Schema


_SCHEMA = """
DROP TABLE IF EXISTS foodkeeper_cooking_methods CASCADE;
DROP TABLE IF EXISTS foodkeeper_cooking_tips CASCADE;
DROP TABLE IF EXISTS foodkeeper_products CASCADE;
DROP TABLE IF EXISTS foodkeeper_categories CASCADE;

CREATE TABLE foodkeeper_categories (
    id                INTEGER PRIMARY KEY,
    category_name     TEXT    NOT NULL,
    subcategory_name  TEXT
);

CREATE TABLE foodkeeper_products (
    id                                INTEGER PRIMARY KEY,
    category_id                       INTEGER REFERENCES foodkeeper_categories(id),
    name                              TEXT    NOT NULL,
    name_subtitle                     TEXT,
    keywords                          TEXT,

    pantry_min                        INTEGER,
    pantry_max                        INTEGER,
    pantry_metric                     TEXT,
    pantry_tips                       TEXT,

    dop_pantry_min                    INTEGER,
    dop_pantry_max                    INTEGER,
    dop_pantry_metric                 TEXT,
    dop_pantry_tips                   TEXT,

    pantry_after_opening_min          INTEGER,
    pantry_after_opening_max          INTEGER,
    pantry_after_opening_metric       TEXT,

    refrigerate_min                   INTEGER,
    refrigerate_max                   INTEGER,
    refrigerate_metric                TEXT,
    refrigerate_tips                  TEXT,

    dop_refrigerate_min               INTEGER,
    dop_refrigerate_max               INTEGER,
    dop_refrigerate_metric            TEXT,
    dop_refrigerate_tips              TEXT,

    refrigerate_after_opening_min     INTEGER,
    refrigerate_after_opening_max     INTEGER,
    refrigerate_after_opening_metric  TEXT,

    refrigerate_after_thawing_min     INTEGER,
    refrigerate_after_thawing_max     INTEGER,
    refrigerate_after_thawing_metric  TEXT,

    freeze_min                        INTEGER,
    freeze_max                        INTEGER,
    freeze_metric                     TEXT,
    freeze_tips                       TEXT,

    dop_freeze_min                    INTEGER,
    dop_freeze_max                    INTEGER,
    dop_freeze_metric                 TEXT,
    dop_freeze_tips                   TEXT
);

CREATE INDEX foodkeeper_products_name_idx         ON foodkeeper_products (LOWER(name));
CREATE INDEX foodkeeper_products_keywords_idx     ON foodkeeper_products (LOWER(keywords));
CREATE INDEX foodkeeper_products_category_id_idx  ON foodkeeper_products (category_id);

CREATE TABLE foodkeeper_cooking_tips (
    id                         INTEGER PRIMARY KEY,
    product_id                 INTEGER NOT NULL REFERENCES foodkeeper_products(id),
    tips                       TEXT,
    safe_minimum_temperature   INTEGER,
    rest_time                  REAL,
    rest_time_metric           TEXT
);

CREATE INDEX foodkeeper_cooking_tips_product_id_idx ON foodkeeper_cooking_tips (product_id);

CREATE TABLE foodkeeper_cooking_methods (
    id                     INTEGER PRIMARY KEY,
    product_id             INTEGER NOT NULL REFERENCES foodkeeper_products(id),
    cooking_method         TEXT,
    measure_from           REAL,
    measure_to             REAL,
    size_metric            TEXT,
    cooking_temperature    TEXT,
    timing_from            REAL,
    timing_to              REAL,
    timing_metric          TEXT,
    timing_per             TEXT
);

CREATE INDEX foodkeeper_cooking_methods_product_id_idx ON foodkeeper_cooking_methods (product_id);
"""


# ---------------------------------------------------------------------------
# Main


def _candidate_paths():
    """Hunt the JSON in the few places a project member might have it."""
    env = os.environ.get("FOODKEEPER_JSON_PATH")
    candidates = []
    if env:
        candidates.append(Path(env))
    candidates += [
        _BACKEND_DIR.parent / "data" / "processed" / "foodkeeper.json",
        _BACKEND_DIR.parent / "data" / "foodkeeper.json",
        _BACKEND_DIR / "data" / "foodkeeper.json",
    ]
    return candidates


def _find_json(path_arg):
    if path_arg:
        p = Path(path_arg)
        if p.exists():
            return p
        raise SystemExit(f"foodkeeper.json not found at {p}")
    for p in _candidate_paths():
        if p.exists():
            return p
    raise SystemExit(
        "foodkeeper.json not found. Tried:\n  "
        + "\n  ".join(str(p) for p in _candidate_paths())
        + "\nSet FOODKEEPER_JSON_PATH or pass the path as an argument."
    )


def seed(json_path: Path):
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    sheets = {s["name"]: s.get("data", []) for s in data.get("sheets", [])}

    with app.app_context():
        # DROP + CREATE runs as a single script; executemany via splitlines
        # wouldn't respect the multi-statement boundaries, so split and run.
        for stmt in _SCHEMA.strip().split(";"):
            stmt = stmt.strip()
            if stmt:
                db.session.execute(text(stmt))
        db.session.commit()

        # ----- categories --------------------------------------------------
        cat_count = 0
        for row in sheets.get("Category", []):
            r = _flatten_row(row)
            rid = _int(r.get("ID"))
            name = _str(r.get("Category_Name"))
            if rid is None or not name:
                continue
            db.session.execute(text("""
                INSERT INTO foodkeeper_categories (id, category_name, subcategory_name)
                VALUES (:id, :cn, :sn)
            """), {
                "id": rid,
                "cn": name,
                "sn": _str(r.get("Subcategory_Name")),
            })
            cat_count += 1
        db.session.commit()

        # ----- products ----------------------------------------------------
        prod_count = 0
        product_ids = set()
        for row in sheets.get("Product", []):
            r = _flatten_row(row)
            rid = _int(r.get("ID"))
            name = _str(r.get("Name"))
            cid = _int(r.get("Category_ID"))
            if rid is None or not name:
                continue
            product_ids.add(rid)
            db.session.execute(text("""
                INSERT INTO foodkeeper_products (
                    id, category_id, name, name_subtitle, keywords,
                    pantry_min, pantry_max, pantry_metric, pantry_tips,
                    dop_pantry_min, dop_pantry_max, dop_pantry_metric, dop_pantry_tips,
                    pantry_after_opening_min, pantry_after_opening_max, pantry_after_opening_metric,
                    refrigerate_min, refrigerate_max, refrigerate_metric, refrigerate_tips,
                    dop_refrigerate_min, dop_refrigerate_max, dop_refrigerate_metric, dop_refrigerate_tips,
                    refrigerate_after_opening_min, refrigerate_after_opening_max, refrigerate_after_opening_metric,
                    refrigerate_after_thawing_min, refrigerate_after_thawing_max, refrigerate_after_thawing_metric,
                    freeze_min, freeze_max, freeze_metric, freeze_tips,
                    dop_freeze_min, dop_freeze_max, dop_freeze_metric, dop_freeze_tips
                ) VALUES (
                    :id, :cid, :name, :sub, :kw,
                    :pm, :pmx, :pme, :pt,
                    :dpm, :dpmx, :dpme, :dpt,
                    :paom, :paomx, :paome,
                    :rm, :rmx, :rme, :rt,
                    :drm, :drmx, :drme, :drt,
                    :raom, :raomx, :raome,
                    :ratm, :ratmx, :ratme,
                    :fm, :fmx, :fme, :ft,
                    :dfm, :dfmx, :dfme, :dft
                )
            """), {
                "id":   rid, "cid": cid, "name": name,
                "sub":  _str(r.get("Name_subtitle")),
                "kw":   _str(r.get("Keywords")),
                "pm":   _int(r.get("Pantry_Min")),    "pmx":  _int(r.get("Pantry_Max")),
                "pme":  _str(r.get("Pantry_Metric")), "pt":   _str(r.get("Pantry_tips")),
                "dpm":  _int(r.get("DOP_Pantry_Min")),    "dpmx": _int(r.get("DOP_Pantry_Max")),
                "dpme": _str(r.get("DOP_Pantry_Metric")), "dpt":  _str(r.get("DOP_Pantry_tips")),
                "paom": _int(r.get("Pantry_After_Opening_Min")),
                "paomx": _int(r.get("Pantry_After_Opening_Max")),
                "paome": _str(r.get("Pantry_After_Opening_Metric")),
                "rm":   _int(r.get("Refrigerate_Min")),    "rmx":  _int(r.get("Refrigerate_Max")),
                "rme":  _str(r.get("Refrigerate_Metric")), "rt":   _str(r.get("Refrigerate_tips")),
                "drm":  _int(r.get("DOP_Refrigerate_Min")),    "drmx": _int(r.get("DOP_Refrigerate_Max")),
                "drme": _str(r.get("DOP_Refrigerate_Metric")), "drt":  _str(r.get("DOP_Refrigerate_tips")),
                "raom":  _int(r.get("Refrigerate_After_Opening_Min")),
                "raomx": _int(r.get("Refrigerate_After_Opening_Max")),
                "raome": _str(r.get("Refrigerate_After_Opening_Metric")),
                "ratm":  _int(r.get("Refrigerate_After_Thawing_Min")),
                "ratmx": _int(r.get("Refrigerate_After_Thawing_Max")),
                "ratme": _str(r.get("Refrigerate_After_Thawing_Metric")),
                "fm":   _int(r.get("Freeze_Min")),    "fmx":  _int(r.get("Freeze_Max")),
                "fme":  _str(r.get("Freeze_Metric")), "ft":   _str(r.get("Freeze_Tips")),
                "dfm":  _int(r.get("DOP_Freeze_Min")),    "dfmx": _int(r.get("DOP_Freeze_Max")),
                "dfme": _str(r.get("DOP_Freeze_Metric")), "dft":  _str(r.get("DOP_Freeze_Tips")),
            })
            prod_count += 1
        db.session.commit()

        # ----- cooking tips ------------------------------------------------
        tips_count = 0
        for row in sheets.get("CookingTips", []):
            r = _flatten_row(row)
            rid = _int(r.get("ID"))
            pid = _int(r.get("Product_ID"))
            if rid is None or pid is None or pid not in product_ids:
                continue
            db.session.execute(text("""
                INSERT INTO foodkeeper_cooking_tips
                    (id, product_id, tips, safe_minimum_temperature, rest_time, rest_time_metric)
                VALUES (:id, :pid, :t, :temp, :rt, :rtm)
            """), {
                "id":   rid, "pid": pid,
                "t":    _str(r.get("Tips")),
                "temp": _int(r.get("Safe_Minimum_Temperature")),
                "rt":   _float(r.get("Rest_Time")),
                "rtm":  _str(r.get("Rest_Time_metric") or r.get("Rest Time_metric")),
            })
            tips_count += 1
        db.session.commit()

        # ----- cooking methods --------------------------------------------
        methods_count = 0
        for row in sheets.get("CookingMethods", []):
            r = _flatten_row(row)
            rid = _int(r.get("ID"))
            pid = _int(r.get("Product_ID"))
            if rid is None or pid is None or pid not in product_ids:
                continue
            db.session.execute(text("""
                INSERT INTO foodkeeper_cooking_methods
                    (id, product_id, cooking_method, measure_from, measure_to, size_metric,
                     cooking_temperature, timing_from, timing_to, timing_metric, timing_per)
                VALUES (:id, :pid, :cm, :mf, :mt, :sm, :ct, :tf, :tt, :tm, :tp)
            """), {
                "id":  rid, "pid": pid,
                "cm":  _str(r.get("Cooking_Method")),
                "mf":  _float(r.get("Measure_from")),
                "mt":  _float(r.get("Measure_to")),
                "sm":  _str(r.get("Size_metric")),
                "ct":  _str(r.get("Cooking_Temperature")),
                "tf":  _float(r.get("Timing_from")),
                "tt":  _float(r.get("Timing_to")),
                "tm":  _str(r.get("Timing_metric")),
                "tp":  _str(r.get("Timing_per")),
            })
            methods_count += 1
        db.session.commit()

    print(f"Seeded foodkeeper data from {json_path}")
    print(f"  categories:      {cat_count}")
    print(f"  products:        {prod_count}")
    print(f"  cooking_tips:    {tips_count}")
    print(f"  cooking_methods: {methods_count}")


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    seed(_find_json(arg))
