"""Shopping list = union of unmatched ingredients across top recommended recipes.
These are items the user doesn't have in the fridge but needs to cook
recommended meals."""
from flask import Blueprint, jsonify, request
from core.database import db
from sqlalchemy import text

from modules.nutrition.classifier import classify
from modules.meal_plan.routes import find_matching_item, SKIP_ITEMS, MIN_ITEM_LENGTH

bp = Blueprint("shopping_list_bp", __name__, url_prefix="/api/shopping")


@bp.route("/list", methods=["GET"])
def get_shopping_list():
    try:
        max_recipes = int(request.args.get("top_recipes", 5))

        rows = db.session.execute(text("""
            SELECT DISTINCT LOWER(TRIM(name)) AS name
            FROM receipt_items
            WHERE name IS NOT NULL AND TRIM(name) != ''
        """)).fetchall()
        all_items = {r._mapping["name"] for r in rows}

        if not all_items:
            return jsonify({"items": [], "note": "No fridge items — upload a receipt first."}), 200

        match_items = {
            item for item in all_items
            if item not in SKIP_ITEMS and len(item) >= MIN_ITEM_LENGTH
        }

        if not match_items:
            return jsonify({"items": [], "note": "No matchable fridge items."}), 200

        like_clauses = []
        params = {}
        for i, item in enumerate(match_items):
            p = f"i{i}"
            like_clauses.append(f"ingredients_clean LIKE :{p}")
            params[p] = f"%{item}%"

        where_sql = " OR ".join(like_clauses)
        recipe_result = db.session.execute(text(
            f"SELECT id, name, ingredients_clean "
            f"FROM recipes "
            f"WHERE ingredients_clean IS NOT NULL AND ({where_sql}) "
            f"LIMIT 8000"
        ), params)

        scored = []
        for row in recipe_result:
            m = row._mapping
            ingredients = [i.strip() for i in (m["ingredients_clean"] or "").split("|") if i.strip()]
            if not ingredients:
                continue
            matched, unmatched = [], []
            for ing in ingredients:
                if find_matching_item(ing, match_items):
                    matched.append(ing)
                else:
                    unmatched.append(ing)
            mc = len(matched)
            total = len(ingredients)
            if mc < 2:
                continue
            scored.append({
                "recipe_id": m["id"],
                "recipe_name": m["name"],
                "unmatched": unmatched,
                "score": mc / total,
                "mc": mc,
            })

        scored.sort(key=lambda x: (-x["score"], -x["mc"]))
        top = scored[:max_recipes]

        agg = {}
        for rec in top:
            for ing in rec["unmatched"]:
                key = ing.lower()
                if key in agg:
                    agg[key]["needed_for"].append(rec["recipe_name"])
                else:
                    agg[key] = {
                        "name": ing,
                        "category": classify(ing),
                        "needed_for": [rec["recipe_name"]],
                    }

        items = sorted(agg.values(), key=lambda x: (-len(x["needed_for"]), x["name"]))

        return jsonify({
            "items": items,
            "based_on_recipes": [
                {"id": r["recipe_id"], "name": r["recipe_name"]} for r in top
            ],
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# Recommendations — three rails for the Shopping List page.
#
# Single round-trip, parallel to the existing /list endpoint (which is
# preserved for any client still calling it). Each rail is independent and
# returns [] rather than erroring when its data source is empty (no
# receipts, no fridge items, no favourites, etc.), so the frontend's empty-
# state copy can take over cleanly.
#
# Caching note: all three rails are computed from scratch on every call.
# Under current load and query shape this comes in under ~150 ms against a
# warm DB. If that ever feels slow, wrap `get_recommendations()` with a
# 60s in-memory TTL keyed on (user_id, latest receipt_items.created_at,
# latest user_favourites.created_at) — stale reads across those surfaces
# are fine.
# ---------------------------------------------------------------------------

_DEMO_USER_ID = 1


def _fridge_match_items():
    """Set of normalised fridge-item names that are valid as recipe-matching
    anchors. Shared across rail helpers. Empty set is valid."""
    rows = db.session.execute(text("""
        SELECT DISTINCT LOWER(TRIM(name)) AS name
        FROM receipt_items
        WHERE name IS NOT NULL AND TRIM(name) != ''
    """)).fetchall()
    fridge_items = {r._mapping["name"] for r in rows}
    return {
        item for item in fridge_items
        if item not in SKIP_ITEMS and len(item) >= MIN_ITEM_LENGTH
    }


def _rail_staples(limit=6):
    """Items the user buys repeatedly but hasn't recently — the "restock"
    rail. Groups `receipt_items` by normalised name, requires count >= 2,
    requires max(created_at) older than 7 days. Sorted by frequency."""
    rows = db.session.execute(text("""
        SELECT LOWER(TRIM(name)) AS name,
               COUNT(*)          AS freq,
               MAX(created_at)   AS last_seen
        FROM receipt_items
        WHERE name IS NOT NULL AND TRIM(name) != ''
        GROUP BY LOWER(TRIM(name))
        HAVING COUNT(*) >= 2
           AND MAX(created_at) < (CURRENT_TIMESTAMP - INTERVAL '7 days')
        ORDER BY COUNT(*) DESC, MAX(created_at) ASC
        LIMIT :lim
    """), {"lim": limit}).fetchall()

    return [
        {
            "name":         r._mapping["name"],
            "category":     classify(r._mapping["name"]),
            "bought_count": int(r._mapping["freq"]),
        }
        for r in rows
    ]


def _rail_complete_recipes(match_items, limit=6, max_recipes_considered=5):
    """Missing ingredients across the top-matching recipes, with each item
    carrying a `completes` list of recipes it would unlock. Ranked so items
    that appear in multiple top recipes float up."""
    if not match_items:
        return []

    like_clauses = []
    params = {}
    for i, item in enumerate(match_items):
        p = f"i{i}"
        like_clauses.append(f"ingredients_clean LIKE :{p}")
        params[p] = f"%{item}%"
    where_sql = " OR ".join(like_clauses)

    rows = db.session.execute(text(
        f"SELECT id, name, ingredients_clean "
        f"FROM recipes "
        f"WHERE ingredients_clean IS NOT NULL AND ({where_sql}) "
        f"LIMIT 8000"
    ), params)

    scored = []
    for row in rows:
        m = row._mapping
        ingredients = [i.strip() for i in (m["ingredients_clean"] or "").split("|") if i.strip()]
        if not ingredients:
            continue
        matched, unmatched = [], []
        for ing in ingredients:
            if find_matching_item(ing, match_items):
                matched.append(ing)
            else:
                unmatched.append(ing)
        if len(matched) < 2:
            continue
        scored.append({
            "recipe_id":   m["id"],
            "recipe_name": m["name"],
            "unmatched":   unmatched,
            "score":       len(matched) / len(ingredients),
            "mc":          len(matched),
        })

    scored.sort(key=lambda x: (-x["score"], -x["mc"]))
    top = scored[:max_recipes_considered]

    agg = {}
    for rec in top:
        for ing in rec["unmatched"]:
            key = ing.lower()
            if key not in agg:
                agg[key] = {
                    "name":      ing,
                    "category":  classify(ing),
                    "completes": [],
                }
            agg[key]["completes"].append({
                "id":   rec["recipe_id"],
                "name": rec["recipe_name"],
            })

    items = sorted(agg.values(), key=lambda x: (-len(x["completes"]), x["name"]))
    return items[:limit]


def _rail_from_favourites(match_items, limit=6):
    """Missing ingredients across the user's favourite recipes. Each item's
    `completes` list names the favourites it would help cook."""
    rows = db.session.execute(text("""
        SELECT r.id, r.name, r.ingredients_clean
        FROM user_favourites uf
        JOIN recipes r ON r.id = uf.recipe_id
        WHERE uf.user_id = :uid
    """), {"uid": _DEMO_USER_ID}).fetchall()

    if not rows:
        return []

    agg = {}
    for row in rows:
        m = row._mapping
        ingredients = [i.strip() for i in (m["ingredients_clean"] or "").split("|") if i.strip()]
        for ing in ingredients:
            if match_items and find_matching_item(ing, match_items):
                continue  # already have it in the fridge
            key = ing.lower()
            if key not in agg:
                agg[key] = {
                    "name":      ing,
                    "category":  classify(ing),
                    "completes": [],
                }
            agg[key]["completes"].append({
                "id":   m["id"],
                "name": m["name"],
            })

    items = sorted(agg.values(), key=lambda x: (-len(x["completes"]), x["name"]))
    return items[:limit]


@bp.route("/recommendations", methods=["GET"])
def get_recommendations():
    try:
        match_items = _fridge_match_items()

        return jsonify({
            "staples":          _rail_staples(limit=6),
            "complete_recipes": _rail_complete_recipes(match_items, limit=6),
            "from_favourites":  _rail_from_favourites(match_items, limit=6),
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
