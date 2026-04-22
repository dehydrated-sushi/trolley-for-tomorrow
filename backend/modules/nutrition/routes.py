from flask import Blueprint, jsonify, request
from core.database import db
from sqlalchemy import text

from .classifier import CATEGORIES, classify

bp = Blueprint("nutrition_bp", __name__, url_prefix="/api/ingredients")

_INITIALISED = False


def _ensure_column():
    """Lazily add the category column and seed it on first request."""
    global _INITIALISED
    if _INITIALISED:
        return

    # Add column if missing (Postgres)
    db.session.execute(text("""
        ALTER TABLE known_ingredients
        ADD COLUMN IF NOT EXISTS category TEXT
    """))
    db.session.commit()

    # Seed any rows whose category is still NULL
    rows = db.session.execute(text("""
        SELECT id, ingredient_name
        FROM known_ingredients
        WHERE category IS NULL
    """)).fetchall()

    if rows:
        # Classify and batch-update
        updates = [
            {"id": r._mapping["id"], "cat": classify(r._mapping["ingredient_name"])}
            for r in rows
        ]
        # Use executemany via bulk update
        db.session.execute(
            text("UPDATE known_ingredients SET category = :cat WHERE id = :id"),
            updates,
        )
        db.session.commit()

    _INITIALISED = True


@bp.route("/categories", methods=["GET"])
def get_categories():
    """Return the legend: category keys → {label, colour, bg, icon, description}."""
    return jsonify({"categories": CATEGORIES}), 200


@bp.route("/classify", methods=["GET"])
def classify_single():
    """Classify a single ingredient by name (handy for frontend debugging)."""
    name = request.args.get("name", "").strip()
    if not name:
        return jsonify({"error": "name query param required"}), 400

    _ensure_column()

    # Check if it's already in known_ingredients
    row = db.session.execute(
        text("SELECT category FROM known_ingredients WHERE LOWER(ingredient_name) = LOWER(:name)"),
        {"name": name},
    ).fetchone()
    if row and row._mapping["category"]:
        return jsonify({"name": name, "category": row._mapping["category"], "source": "known"}), 200

    # Fallback: classify on the fly
    return jsonify({
        "name": name,
        "category": classify(name),
        "source": "rule",
    }), 200


@bp.route("/reseed", methods=["POST"])
def reseed():
    """Reclassify ALL ingredients using the current rules. Use after
    classifier changes. Satisfies AC: 'Colour tags update automatically
    if an ingredient's category classification changes.'"""
    db.session.execute(text("""
        ALTER TABLE known_ingredients
        ADD COLUMN IF NOT EXISTS category TEXT
    """))
    db.session.commit()

    rows = db.session.execute(
        text("SELECT id, ingredient_name FROM known_ingredients")
    ).fetchall()

    updates = [
        {"id": r._mapping["id"], "cat": classify(r._mapping["ingredient_name"])}
        for r in rows
    ]
    if updates:
        db.session.execute(
            text("UPDATE known_ingredients SET category = :cat WHERE id = :id"),
            updates,
        )
        db.session.commit()

    # Count per category for quick sanity check
    counts_rows = db.session.execute(text("""
        SELECT category, COUNT(*) AS n
        FROM known_ingredients
        GROUP BY category
        ORDER BY n DESC
    """)).fetchall()
    counts = {r._mapping["category"] or "null": r._mapping["n"] for r in counts_rows}

    return jsonify({"reseeded": len(updates), "counts": counts}), 200
