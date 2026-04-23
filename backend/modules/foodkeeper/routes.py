"""FoodKeeper endpoints — USDA FSIS food storage + cooking reference data.

Source
------
USDA Food Safety and Inspection Service (FSIS) FoodKeeper dataset, version 128
(last updated 2018-09-06). Distributed via data.gov as public-domain US
government data.
  https://catalog.data.gov/dataset/fsis-foodkeeper-data

Tables (all created by `backend/scripts/seed_foodkeeper.py`, never modified at
request time):
  - foodkeeper_categories          25 rows
  - foodkeeper_products           ~680 rows, storage times across pantry /
                                  refrigerate / freeze + after-opening and
                                  date-of-purchase variants
  - foodkeeper_cooking_tips       ~90 rows, cooking tips + safe minimum
                                  temperatures + rest times per product
  - foodkeeper_cooking_methods    ~90 rows, cooking method/temp/time pairs

Endpoints
---------
  GET /api/foodkeeper/tips?limit=N         Random conversational tips, deduped,
                                           filtered for tone (length + sentence
                                           punctuation). Safe to call on page
                                           load — no DB writes, cheap query.
  GET /api/foodkeeper/products?q=<term>    Keyword search against product name,
                                           subtitle, and comma-separated
                                           keywords column.
  GET /api/foodkeeper/products/<id>        Full product record + cooking tips +
                                           cooking methods joined in.
  GET /api/foodkeeper/categories           All categories (flat list).
  GET /api/foodkeeper/attribution          Source + URL + licence, surfaced in
                                           UI next to any rendered tip.

Empty-database behaviour: every endpoint gracefully returns an empty payload
with `attribution` populated when the tables are empty or missing (before
`seed_foodkeeper.py` has been run). The frontend treats an empty response as
"feature not available yet" and falls back to its hardcoded content.
"""

from flask import Blueprint, abort, jsonify, request
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError

from core.database import db

bp = Blueprint("foodkeeper_bp", __name__, url_prefix="/api/foodkeeper")

# Every response carrying FoodKeeper data echoes this block so clients always
# have the attribution string to display alongside the content.
_ATTRIBUTION = {
    "source":   "USDA FSIS FoodKeeper Data",
    "version":  "128 (2018-09-06)",
    "url":      "https://catalog.data.gov/dataset/fsis-foodkeeper-data",
    "licence":  "Public domain (U.S. government work)",
}

# Smallest tip body length we'll ever surface to users. Filters out the many
# terse rows like "Below 75 °F" that don't read as tips.
_MIN_TIP_LENGTH = 40


def _tables_exist() -> bool:
    """Cheap probe before the real query so an un-seeded DB returns empty
    payloads instead of 500s."""
    try:
        db.session.execute(text("SELECT 1 FROM foodkeeper_products LIMIT 1"))
        return True
    except ProgrammingError:
        db.session.rollback()
        return False
    except Exception:
        db.session.rollback()
        return False


@bp.route("/attribution", methods=["GET"])
def get_attribution():
    return jsonify(_ATTRIBUTION), 200


@bp.route("/tips", methods=["GET"])
def get_tips():
    """Return `limit` conversational tips, random-ordered, de-duplicated.

    Query params:
      limit   int, default 1, clamped to [1, 20]

    Tone filter: tips must be ≥ 40 chars AND end with sentence punctuation
    (`.`, `!`, or `?` — optionally trailed by whitespace). Duplicates are
    collapsed by a lowercased-trimmed form of the body, so the same generic
    "Braising is …" line attached to 40+ meat products only shows once.
    """
    try:
        limit = int(request.args.get("limit", 1))
    except (TypeError, ValueError):
        limit = 1
    limit = max(1, min(20, limit))

    if not _tables_exist():
        return jsonify({"tips": [], "attribution": _ATTRIBUTION}), 200

    # UNION ALL across the four tip-bearing columns on products, plus the
    # cooking_tips table. DISTINCT ON the lowercased body performs the dedup.
    # RANDOM() orders the final set; LIMIT cuts it down.
    rows = db.session.execute(text("""
        WITH candidates AS (
            SELECT p.id AS product_id, p.name AS product_name,
                   c.category_name, p.pantry_tips AS body, 'pantry' AS source_field
            FROM foodkeeper_products p
            LEFT JOIN foodkeeper_categories c ON p.category_id = c.id
            WHERE p.pantry_tips IS NOT NULL
              AND LENGTH(p.pantry_tips) >= :min_len
              AND p.pantry_tips ~ '[.!?]\\s*$'
            UNION ALL
            SELECT p.id, p.name, c.category_name, p.refrigerate_tips, 'refrigerate'
            FROM foodkeeper_products p
            LEFT JOIN foodkeeper_categories c ON p.category_id = c.id
            WHERE p.refrigerate_tips IS NOT NULL
              AND LENGTH(p.refrigerate_tips) >= :min_len
              AND p.refrigerate_tips ~ '[.!?]\\s*$'
            UNION ALL
            SELECT p.id, p.name, c.category_name, p.freeze_tips, 'freeze'
            FROM foodkeeper_products p
            LEFT JOIN foodkeeper_categories c ON p.category_id = c.id
            WHERE p.freeze_tips IS NOT NULL
              AND LENGTH(p.freeze_tips) >= :min_len
              AND p.freeze_tips ~ '[.!?]\\s*$'
            UNION ALL
            SELECT p.id, p.name, c.category_name, p.dop_pantry_tips, 'pantry'
            FROM foodkeeper_products p
            LEFT JOIN foodkeeper_categories c ON p.category_id = c.id
            WHERE p.dop_pantry_tips IS NOT NULL
              AND LENGTH(p.dop_pantry_tips) >= :min_len
              AND p.dop_pantry_tips ~ '[.!?]\\s*$'
            UNION ALL
            SELECT ct.product_id, p.name, c.category_name, ct.tips, 'cooking'
            FROM foodkeeper_cooking_tips ct
            JOIN foodkeeper_products p ON ct.product_id = p.id
            LEFT JOIN foodkeeper_categories c ON p.category_id = c.id
            WHERE ct.tips IS NOT NULL
              AND LENGTH(ct.tips) >= :min_len
              AND ct.tips ~ '[.!?]\\s*$'
        ),
        deduped AS (
            SELECT DISTINCT ON (LOWER(TRIM(body)))
                   product_id, product_name, category_name, body, source_field
            FROM candidates
        )
        SELECT product_id, product_name, category_name, body, source_field
        FROM deduped
        ORDER BY RANDOM()
        LIMIT :limit
    """), {"min_len": _MIN_TIP_LENGTH, "limit": limit}).fetchall()

    return jsonify({
        "tips": [
            {
                "product_id":     r._mapping["product_id"],
                "product_name":   r._mapping["product_name"],
                "category_name":  r._mapping["category_name"],
                "body":           r._mapping["body"],
                "source_field":   r._mapping["source_field"],
            }
            for r in rows
        ],
        "attribution": _ATTRIBUTION,
    }), 200


@bp.route("/categories", methods=["GET"])
def list_categories():
    if not _tables_exist():
        return jsonify({"categories": [], "attribution": _ATTRIBUTION}), 200

    rows = db.session.execute(text("""
        SELECT id, category_name, subcategory_name
        FROM foodkeeper_categories
        ORDER BY category_name, subcategory_name NULLS FIRST
    """)).fetchall()
    return jsonify({
        "categories":  [dict(r._mapping) for r in rows],
        "attribution": _ATTRIBUTION,
    }), 200


@bp.route("/products", methods=["GET"])
def search_products():
    """Fuzzy keyword search over name / subtitle / keywords column."""
    q = (request.args.get("q") or "").strip()
    try:
        limit = int(request.args.get("limit", 20))
    except (TypeError, ValueError):
        limit = 20
    limit = max(1, min(100, limit))

    if not _tables_exist() or not q:
        return jsonify({"products": [], "attribution": _ATTRIBUTION}), 200

    like = f"%{q.lower()}%"
    rows = db.session.execute(text("""
        SELECT p.id, p.name, p.name_subtitle, p.category_id, c.category_name
        FROM foodkeeper_products p
        LEFT JOIN foodkeeper_categories c ON p.category_id = c.id
        WHERE LOWER(p.name)          LIKE :like
           OR LOWER(p.name_subtitle) LIKE :like
           OR LOWER(p.keywords)      LIKE :like
        ORDER BY
            CASE WHEN LOWER(p.name) = :exact THEN 0
                 WHEN LOWER(p.name) LIKE :prefix THEN 1
                 ELSE 2 END,
            p.name
        LIMIT :limit
    """), {
        "like":   like,
        "exact":  q.lower(),
        "prefix": f"{q.lower()}%",
        "limit":  limit,
    }).fetchall()

    return jsonify({
        "products":    [dict(r._mapping) for r in rows],
        "attribution": _ATTRIBUTION,
    }), 200


@bp.route("/products/<int:product_id>", methods=["GET"])
def get_product(product_id):
    """Full product row + its cooking tips + cooking methods."""
    if not _tables_exist():
        abort(404)

    product_row = db.session.execute(text("""
        SELECT p.*, c.category_name, c.subcategory_name
        FROM foodkeeper_products p
        LEFT JOIN foodkeeper_categories c ON p.category_id = c.id
        WHERE p.id = :pid
    """), {"pid": product_id}).fetchone()

    if product_row is None:
        abort(404)

    cooking_tips = db.session.execute(text("""
        SELECT id, tips, safe_minimum_temperature, rest_time, rest_time_metric
        FROM foodkeeper_cooking_tips
        WHERE product_id = :pid
    """), {"pid": product_id}).fetchall()

    cooking_methods = db.session.execute(text("""
        SELECT id, cooking_method, measure_from, measure_to, size_metric,
               cooking_temperature, timing_from, timing_to, timing_metric, timing_per
        FROM foodkeeper_cooking_methods
        WHERE product_id = :pid
        ORDER BY id
    """), {"pid": product_id}).fetchall()

    return jsonify({
        "product":         dict(product_row._mapping),
        "cooking_tips":    [dict(r._mapping) for r in cooking_tips],
        "cooking_methods": [dict(r._mapping) for r in cooking_methods],
        "attribution":     _ATTRIBUTION,
    }), 200
