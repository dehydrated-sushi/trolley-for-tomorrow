from flask import Blueprint, jsonify, request
from core.database import db
from sqlalchemy import text

from modules.nutrition.dietary import PREFERENCES, PREFERENCE_LABELS

bp = Blueprint("profile_bp", __name__, url_prefix="/api/profile")

# Single-row tables for the demo user (row id=1 always).
_TABLE_INITIALISED = False


def _ensure_table():
    """Lazily create profile tables on first request."""
    global _TABLE_INITIALISED
    if _TABLE_INITIALISED:
        return
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS user_budget (
            id INTEGER PRIMARY KEY,
            weekly_budget REAL NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    # Dietary preferences: one boolean column per preference, single row.
    cols = ", ".join(f"{p} BOOLEAN DEFAULT FALSE" for p in PREFERENCES)
    db.session.execute(text(f"""
        CREATE TABLE IF NOT EXISTS user_preferences (
            id INTEGER PRIMARY KEY,
            {cols},
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.session.commit()
    _TABLE_INITIALISED = True


def _load_preferences():
    """Return dict of {pref_key: bool} for the demo user (row id=1).
    Returns all-False dict if no row exists yet."""
    _ensure_table()
    row = db.session.execute(
        text(f"SELECT {', '.join(PREFERENCES)} FROM user_preferences WHERE id = 1")
    ).fetchone()
    if row is None:
        return {p: False for p in PREFERENCES}
    return {p: bool(row._mapping[p]) for p in PREFERENCES}


def _active_preferences():
    """Return list of preference keys that are currently enabled."""
    prefs = _load_preferences()
    return [p for p, enabled in prefs.items() if enabled]


@bp.route("/budget", methods=["GET"])
def get_budget():
    try:
        _ensure_table()
        row = db.session.execute(
            text("SELECT weekly_budget FROM user_budget WHERE id = 1")
        ).fetchone()
        if row is None:
            return jsonify({"budget": None}), 200
        return jsonify({"budget": float(row._mapping["weekly_budget"])}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/budget-status", methods=["GET"])
def get_budget_status():
    """Return {budget, spent_this_week, remaining}.
    spent_this_week = sum of receipt_items.price in the last 7 days.
    remaining = budget - spent_this_week (can be null if no budget set, or negative if over)."""
    try:
        _ensure_table()

        # Current budget (may be null)
        row = db.session.execute(
            text("SELECT weekly_budget FROM user_budget WHERE id = 1")
        ).fetchone()
        budget = float(row._mapping["weekly_budget"]) if row else None

        # Spent in last 7 days (rolling window)
        spent_row = db.session.execute(text("""
            SELECT COALESCE(SUM(price), 0) AS spent
            FROM receipt_items
            WHERE price IS NOT NULL
              AND created_at >= (CURRENT_TIMESTAMP - INTERVAL '7 days')
        """)).fetchone()
        spent = float(spent_row._mapping["spent"]) if spent_row else 0.0
        spent = round(spent, 2)

        remaining = None
        if budget is not None:
            remaining = round(budget - spent, 2)

        return jsonify({
            "budget": budget,
            "spent_this_week": spent,
            "remaining": remaining,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/preferences", methods=["GET"])
def get_preferences():
    """Return the dietary preference flags for the demo user."""
    try:
        prefs = _load_preferences()
        return jsonify({
            "preferences": prefs,
            "labels": PREFERENCE_LABELS,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/preferences", methods=["POST"])
def set_preferences():
    """Upsert dietary preferences.

    Body shape: {preferences: {vegetarian: true, vegan: false, ...}}
    Unknown keys are ignored. Missing keys default to False.
    """
    try:
        _ensure_table()
        payload = request.get_json(silent=True) or {}
        incoming = payload.get("preferences", {})

        if not isinstance(incoming, dict):
            return jsonify({"error": "'preferences' must be an object"}), 400

        # Build normalised values: each known pref either True or False
        values = {}
        for p in PREFERENCES:
            raw = incoming.get(p, False)
            # Accept booleans and common truthy/falsy values
            if isinstance(raw, bool):
                values[p] = raw
            elif isinstance(raw, str):
                values[p] = raw.strip().lower() in ("true", "1", "yes", "on")
            else:
                values[p] = bool(raw)

        # Upsert
        col_list = ", ".join(PREFERENCES)
        placeholders = ", ".join(f":{p}" for p in PREFERENCES)
        update_set = ", ".join(f"{p} = EXCLUDED.{p}" for p in PREFERENCES)

        sql = f"""
            INSERT INTO user_preferences (id, {col_list}, updated_at)
            VALUES (1, {placeholders}, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                {update_set},
                updated_at = CURRENT_TIMESTAMP
        """
        db.session.execute(text(sql), values)
        db.session.commit()

        return jsonify({
            "preferences": values,
            "labels": PREFERENCE_LABELS,
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@bp.route("/budget", methods=["POST"])
def set_budget():
    try:
        _ensure_table()
        payload = request.get_json(silent=True) or {}
        raw = payload.get("budget")

        # Validate: must be numeric and > 0
        try:
            budget = float(raw)
        except (TypeError, ValueError):
            return jsonify({"error": "Budget must be a number"}), 400

        if budget <= 0:
            return jsonify({"error": "Budget must be a positive value"}), 400

        # Upsert row id=1
        db.session.execute(
            text("""
                INSERT INTO user_budget (id, weekly_budget, updated_at)
                VALUES (1, :b, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET
                    weekly_budget = excluded.weekly_budget,
                    updated_at = CURRENT_TIMESTAMP
            """),
            {"b": budget},
        )
        db.session.commit()

        return jsonify({"budget": budget}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
