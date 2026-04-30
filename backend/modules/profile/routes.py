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
        try:
            db.session.execute(text("SELECT 1 FROM user_preferences LIMIT 1"))
            db.session.execute(text("SELECT 1 FROM user_budget LIMIT 1"))
            return
        except Exception:
            db.session.rollback()
            _TABLE_INITIALISED = False

    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS user_budget (
            id INTEGER PRIMARY KEY,
            weekly_budget REAL NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    if db.engine.dialect.name == "sqlite":
        budget_cols = {
            row._mapping["name"]
            for row in db.session.execute(text("PRAGMA table_info(user_budget)"))
        }
    else:
        budget_cols = {
            row._mapping["column_name"]
            for row in db.session.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'user_budget'
            """))
        }
    if "updated_at" not in budget_cols:
        db.session.execute(text("ALTER TABLE user_budget ADD COLUMN updated_at TIMESTAMP"))

    # Dietary preferences: one boolean column per preference, single row.
    cols = ", ".join(f"{p} BOOLEAN DEFAULT FALSE" for p in PREFERENCES)
    db.session.execute(text(f"""
        CREATE TABLE IF NOT EXISTS user_preferences (
            id INTEGER PRIMARY KEY,
            {cols},
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    if db.engine.dialect.name == "sqlite":
        existing_cols = {
            row._mapping["name"]
            for row in db.session.execute(text("PRAGMA table_info(user_preferences)"))
        }
    else:
        existing_cols = {
            row._mapping["column_name"]
            for row in db.session.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'user_preferences'
            """))
        }
    if "preference_key" in existing_cols:
        legacy_rows = db.session.execute(text("""
            SELECT preference_key, preference_value
            FROM user_preferences
            WHERE preference_key IS NOT NULL
        """)).fetchall()
        migrated_values = {p: False for p in PREFERENCES}
        for row in legacy_rows:
            key = row._mapping["preference_key"]
            if key not in migrated_values:
                continue
            value = str(row._mapping["preference_value"] or "").strip().lower()
            migrated_values[key] = value in ("true", "1", "yes", "on")

        db.session.execute(text("DROP TABLE user_preferences"))
        db.session.execute(text(f"""
            CREATE TABLE user_preferences (
                id INTEGER PRIMARY KEY,
                {cols},
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        col_list = ", ".join(PREFERENCES)
        placeholders = ", ".join(f":{p}" for p in PREFERENCES)
        db.session.execute(text(f"""
            INSERT INTO user_preferences (id, {col_list}, updated_at)
            VALUES (1, {placeholders}, CURRENT_TIMESTAMP)
        """), migrated_values)
        existing_cols = {"id", *PREFERENCES, "updated_at"}

    for pref in PREFERENCES:
        if pref not in existing_cols:
            db.session.execute(
                text(f"ALTER TABLE user_preferences ADD COLUMN {pref} BOOLEAN DEFAULT FALSE")
            )
    if "updated_at" not in existing_cols:
        db.session.execute(text("ALTER TABLE user_preferences ADD COLUMN updated_at TIMESTAMP"))
    # Favourite recipes. Composite PK keeps it star-toggle-idempotent without
    # needing a separate id column. user_id kept in the schema so the multi-
    # user future is a schema-compatible pivot, not a migration.
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS user_favourites (
            user_id    INTEGER NOT NULL,
            recipe_id  INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    # The table may have been created without a PK (e.g. on a shared DB by an
    # older migration). A unique index satisfies ON CONFLICT just as well.
    db.session.execute(text("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_favourites_unique
        ON user_favourites (user_id, recipe_id)
    """))
    db.session.commit()
    _TABLE_INITIALISED = True


def _seven_days_ago_sql():
    if db.engine.dialect.name == "sqlite":
        return "datetime('now', '-7 days')"
    return "CURRENT_TIMESTAMP - INTERVAL '7 days'"


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
              AND created_at >= """ + _seven_days_ago_sql())).fetchone()
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


# ---------------------------------------------------------------------------
# Favourite recipes
#
# Single-user demo, user_id = 1 for every row. Composite PK (user_id,
# recipe_id) makes the PUT endpoint naturally idempotent — re-starring an
# already-favourite recipe is a no-op at the DB level thanks to
# ON CONFLICT DO NOTHING.
# ---------------------------------------------------------------------------

_DEMO_USER_ID = 1


@bp.route("/favourites", methods=["GET"])
def list_favourites():
    """Return the user's favourite recipes, joined with the recipes table so
    the caller gets full records (name, ingredients_clean, match surfaces,
    etc.) without a second round-trip."""
    try:
        _ensure_table()
        rows = db.session.execute(text("""
            SELECT r.id, r.name, r.ingredients_clean, r.steps_clean,
                   r.calories, r.protein, r.carbohydrates, r.sugar,
                   r.total_fat, r.saturated_fat, r.sodium,
                   r.minutes, r.n_ingredients,
                   uf.created_at AS favourited_at
            FROM user_favourites uf
            JOIN recipes r ON r.id = uf.recipe_id
            WHERE uf.user_id = :uid
            ORDER BY uf.created_at DESC
        """), {"uid": _DEMO_USER_ID}).fetchall()

        recipes = []
        for r in rows:
            m = dict(r._mapping)
            # Split pipe-delimited fields the same way meal_plan does.
            m["ingredients"] = [
                i.strip() for i in (m.pop("ingredients_clean") or "").split("|") if i.strip()
            ]
            m["steps"] = [
                s.strip() for s in (m.pop("steps_clean") or "").split("|") if s.strip()
            ]
            recipes.append(m)

        return jsonify({
            "favourite_recipe_ids": [r["id"] for r in recipes],
            "favourites":           recipes,
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@bp.route("/favourites/<int:recipe_id>", methods=["PUT"])
def add_favourite(recipe_id):
    """Idempotent star. Returns the new state so the client can verify."""
    try:
        _ensure_table()

        # Confirm the recipe exists before inserting — avoids orphan rows if
        # a stale client sends a recipe_id that was deleted.
        row = db.session.execute(
            text("SELECT id FROM recipes WHERE id = :rid"),
            {"rid": recipe_id},
        ).fetchone()
        if row is None:
            return jsonify({"error": "recipe not found"}), 404

        db.session.execute(text("""
            INSERT INTO user_favourites (user_id, recipe_id)
            VALUES (:uid, :rid)
            ON CONFLICT (user_id, recipe_id) DO NOTHING
        """), {"uid": _DEMO_USER_ID, "rid": recipe_id})
        db.session.commit()

        return jsonify({"recipe_id": recipe_id, "favourited": True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@bp.route("/favourites/<int:recipe_id>", methods=["DELETE"])
def remove_favourite(recipe_id):
    """Idempotent un-star. No-op if not currently starred."""
    try:
        _ensure_table()
        db.session.execute(text("""
            DELETE FROM user_favourites
            WHERE user_id = :uid AND recipe_id = :rid
        """), {"uid": _DEMO_USER_ID, "rid": recipe_id})
        db.session.commit()
        return jsonify({"recipe_id": recipe_id, "favourited": False}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
