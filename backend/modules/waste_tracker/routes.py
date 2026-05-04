from collections import defaultdict
from datetime import date, timedelta
import json
import re

from flask import Blueprint, jsonify, request
from sqlalchemy import inspect, text

from core.database import db
from modules.nutrition.classifier import classify
from modules.receipt.service import normalise_expiry_date

bp = Blueprint("waste_tracker_bp", __name__, url_prefix="/api/waste")

WASTE_EVENT_TYPES = frozenset({"wasted", "expired"})
EVENT_TYPES = WASTE_EVENT_TYPES | frozenset({"cooked", "saved_leftover"})
CO2_KG_PER_FOOD_KG = 2.5

_QTY_UNITS = {
    "g": ("g", 1),
    "gram": ("g", 1),
    "grams": ("g", 1),
    "kg": ("g", 1000),
    "kilogram": ("g", 1000),
    "kilograms": ("g", 1000),
    "ml": ("ml", 1),
    "millilitre": ("ml", 1),
    "millilitres": ("ml", 1),
    "milliliter": ("ml", 1),
    "milliliters": ("ml", 1),
    "l": ("ml", 1000),
    "lt": ("ml", 1000),
    "liter": ("ml", 1000),
    "liters": ("ml", 1000),
    "litre": ("ml", 1000),
    "litres": ("ml", 1000),
}


def _id_column_sql():
    if db.engine.dialect.name == "sqlite":
        return "INTEGER PRIMARY KEY AUTOINCREMENT"
    return "SERIAL PRIMARY KEY"


def _ensure_table():
    db.session.execute(text(f"""
        CREATE TABLE IF NOT EXISTS waste_events (
            id {_id_column_sql()},
            user_id INTEGER DEFAULT 1,
            receipt_item_id INTEGER,
            recipe_id INTEGER,
            recipe_name TEXT,
            item_name TEXT NOT NULL,
            category TEXT,
            event_type TEXT NOT NULL,
            quantity_grams DOUBLE PRECISION DEFAULT 0,
            quantity_label TEXT,
            cost_impact DOUBLE PRECISION DEFAULT 0,
            reason TEXT,
            metadata_json TEXT,
            event_date DATE DEFAULT CURRENT_DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.session.commit()
    columns = {
        column["name"]
        for column in inspect(db.engine).get_columns("waste_events")
    }
    if "metadata_json" not in columns:
        db.session.execute(text("""
            ALTER TABLE waste_events
            ADD COLUMN metadata_json TEXT
        """))
    db.session.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_waste_events_event_date
        ON waste_events (event_date)
    """))
    db.session.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_waste_events_type
        ON waste_events (event_type)
    """))
    db.session.commit()


def _parse_float(value, field, minimum=0):
    if value in (None, ""):
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be a number") from exc
    if parsed < minimum:
        raise ValueError(f"{field} cannot be negative")
    return parsed


def _format_quantity(value, unit):
    value = max(0, float(value or 0))
    if unit == "g" and value >= 1000:
        kg = value / 1000
        return f"{kg:g} kg"
    if unit == "ml" and value >= 1000:
        litres = value / 1000
        return f"{litres:g} l"
    return f"{value:g} {unit}"


def _quantity_to_base(value):
    if value in (None, ""):
        return None
    match = re.search(r"(\d+(?:\.\d+)?)\s*([a-zA-Z]+)", str(value).strip().lower())
    if not match:
        return None
    unit_info = _QTY_UNITS.get(match.group(2))
    if not unit_info:
        return None
    unit, multiplier = unit_info
    return float(match.group(1)) * multiplier, unit


def _decrement_fridge_items(ingredient_usage):
    updates = []
    for ingredient in ingredient_usage or []:
        receipt_item_id = ingredient.get("receipt_item_id")
        grams_used = ingredient.get("grams_used") or ingredient.get("quantity_grams")
        try:
            receipt_item_id = int(receipt_item_id)
            grams_used = float(grams_used or 0)
        except (TypeError, ValueError):
            continue
        if grams_used <= 0:
            continue

        row = db.session.execute(text("""
            SELECT id, name, qty, price
            FROM receipt_items
            WHERE id = :id
        """), {"id": receipt_item_id}).fetchone()
        if not row:
            continue

        item = row._mapping
        parsed_qty = _quantity_to_base(item["qty"])
        if not parsed_qty:
            continue

        current_amount, unit = parsed_qty
        remaining = max(0, current_amount - grams_used)
        if remaining <= 0.5:
            db.session.execute(text("""
                DELETE FROM receipt_items
                WHERE id = :id
            """), {"id": receipt_item_id})
            updates.append({
                "receipt_item_id": receipt_item_id,
                "name": item["name"],
                "previous_qty": item["qty"],
                "new_qty": None,
                "removed": True,
            })
            continue

        new_qty = _format_quantity(remaining, unit)
        price = item["price"]
        new_price = None
        if price is not None and current_amount > 0:
            new_price = round(float(price) * (remaining / current_amount), 2)
        db.session.execute(text("""
            UPDATE receipt_items
            SET qty = :qty,
                price = :price
            WHERE id = :id
        """), {
            "id": receipt_item_id,
            "qty": new_qty,
            "price": new_price,
        })
        updates.append({
            "receipt_item_id": receipt_item_id,
            "name": item["name"],
            "previous_qty": item["qty"],
            "new_qty": new_qty,
            "removed": False,
        })
    return updates


def _parse_int(value, field):
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be an integer") from exc


def _parse_event_date(value):
    if value in (None, ""):
        return date.today()
    return normalise_expiry_date(value)


def _event_to_dict(row):
    m = dict(row._mapping)
    event_date = m.get("event_date")
    created_at = m.get("created_at")
    m["event_date"] = event_date.isoformat() if hasattr(event_date, "isoformat") else str(event_date)
    m["created_at"] = created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at)
    m["quantity_grams"] = float(m["quantity_grams"] or 0)
    m["cost_impact"] = float(m["cost_impact"] or 0)
    metadata_raw = m.pop("metadata_json", None)
    if metadata_raw:
        try:
            m["metadata"] = json.loads(metadata_raw)
        except (TypeError, ValueError):
            m["metadata"] = {}
    else:
        m["metadata"] = {}
    return m


def _ingredient_usage_key(ingredient):
    return str(
        ingredient.get("receipt_item_id")
        or ingredient.get("fridge_item")
        or ingredient.get("display_name")
        or ingredient.get("name")
        or ingredient.get("item")
        or ingredient.get("recipe_ingredient")
        or "ingredient"
    ).strip().lower()


def _ingredient_usage_grams(ingredient):
    try:
        return float(
            ingredient.get("grams_used")
            or ingredient.get("quantity_grams")
            or 0
        )
    except (TypeError, ValueError):
        return 0.0


def _ingredient_usage_cost(ingredient):
    try:
        cost = float(
            ingredient.get("estimated_cost")
            or ingredient.get("cost_impact")
            or 0
        )
    except (TypeError, ValueError):
        cost = 0.0
    if cost > 0:
        return cost

    try:
        grams = _ingredient_usage_grams(ingredient)
        price_per_gram = float(ingredient.get("price_per_gram") or 0)
    except (TypeError, ValueError):
        return 0.0
    return grams * price_per_gram if grams > 0 and price_per_gram > 0 else 0.0


def _aggregate_ingredient_usage(ingredient_usage):
    grouped = {}
    order = []
    for ingredient in ingredient_usage or []:
        if not isinstance(ingredient, dict):
            continue
        key = _ingredient_usage_key(ingredient)
        if key not in grouped:
            display_name = (
                ingredient.get("display_name")
                or ingredient.get("fridge_item")
                or ingredient.get("name")
                or ingredient.get("item")
                or ingredient.get("recipe_ingredient")
            )
            grouped[key] = {
                **ingredient,
                "name": display_name,
                "display_name": display_name,
                "grams_used": 0.0,
                "quantity_grams": 0.0,
                "estimated_cost": 0.0,
                "cost_impact": 0.0,
                "recipe_ingredients": [],
            }
            order.append(key)

        row = grouped[key]
        grams = _ingredient_usage_grams(ingredient)
        cost = _ingredient_usage_cost(ingredient)
        row["grams_used"] += grams
        row["quantity_grams"] += grams
        row["estimated_cost"] += cost
        row["cost_impact"] += cost

        recipe_ingredient = ingredient.get("recipe_ingredient") or ingredient.get("name")
        if recipe_ingredient and recipe_ingredient not in row["recipe_ingredients"]:
            row["recipe_ingredients"].append(recipe_ingredient)

        if row.get("category") in (None, "", "other") and ingredient.get("category"):
            row["category"] = ingredient["category"]
        if not row.get("expiry_date") and ingredient.get("expiry_date"):
            row["expiry_date"] = ingredient["expiry_date"]

    return [
        {
            **grouped[key],
            "grams_used": round(grouped[key]["grams_used"], 2),
            "quantity_grams": round(grouped[key]["quantity_grams"], 2),
            "estimated_cost": round(grouped[key]["estimated_cost"], 2),
            "cost_impact": round(grouped[key]["cost_impact"], 2),
        }
        for key in order
    ]


def _cooked_meal_from_event(event):
    metadata = event.get("metadata") or {}
    ingredient_usage = _aggregate_ingredient_usage(metadata.get("ingredient_usage", []))
    metadata = {
        **metadata,
        "ingredient_usage": ingredient_usage,
    }
    return {
        "id": event["id"],
        "event_id": event["id"],
        "recipe_id": event["recipe_id"],
        "recipe_name": event["recipe_name"] or event["item_name"],
        "name": event["recipe_name"] or event["item_name"],
        "servings": event.get("quantity_label") or "1 serving",
        "quantity_grams": event["quantity_grams"],
        "cooked_date": event["event_date"],
        "cooked_time": metadata.get("cooked_time"),
        "created_at": event["created_at"],
        "notes": event.get("reason"),
        "metadata": metadata,
        "ingredient_usage": ingredient_usage,
        "action": metadata.get("action", "cooked"),
        "waste_log": metadata.get("waste_log"),
    }


def _cooked_meal_to_dict(row):
    return _cooked_meal_from_event(_event_to_dict(row))


def _load_cooked_waste_history(cooked_event_ids, start_date=None):
    cooked_event_ids = {
        int(event_id)
        for event_id in cooked_event_ids
        if event_id not in (None, "")
    }
    if not cooked_event_ids:
        return {}

    params = {}
    date_filter = ""
    if start_date is not None:
        date_filter = "AND event_date >= :start_date"
        params["start_date"] = start_date

    rows = db.session.execute(text(f"""
        SELECT *
        FROM waste_events
        WHERE event_type IN ('wasted', 'expired')
          AND metadata_json IS NOT NULL
          {date_filter}
        ORDER BY event_date ASC, created_at ASC
    """), params).fetchall()

    grouped = defaultdict(list)
    for row in rows:
        event = _event_to_dict(row)
        cooked_event_id = (event.get("metadata") or {}).get("cooked_event_id")
        try:
            cooked_event_id = int(cooked_event_id)
        except (TypeError, ValueError):
            continue
        if cooked_event_id in cooked_event_ids:
            grouped[cooked_event_id].append(event)
    return grouped


def _date_from_row(value):
    if hasattr(value, "date"):
        return value.date()
    if hasattr(value, "isoformat") and not isinstance(value, str):
        return value
    return normalise_expiry_date(str(value)[:10])


def _round_money(value):
    return round(float(value or 0), 2)


def _round_kg(grams):
    return round(float(grams or 0) / 1000, 2)


def _empty_trends(start_date, days):
    return {
        (start_date + timedelta(days=offset)).isoformat(): {
            "date": (start_date + timedelta(days=offset)).isoformat(),
            "weight_grams": 0.0,
            "food_waste_kg": 0.0,
            "weight_kg": 0.0,
            "cost_impact": 0.0,
        }
        for offset in range(days)
    }


def _load_at_risk_items(today):
    try:
        rows = db.session.execute(text("""
            SELECT
                name,
                matched_name,
                price,
                expiry_date
            FROM receipt_items
            WHERE expiry_date IS NOT NULL
              AND expiry_date >= :today
              AND expiry_date <= :soon
            ORDER BY expiry_date ASC, LOWER(name) ASC
            LIMIT 6
        """), {
            "today": today,
            "soon": today + timedelta(days=3),
        }).fetchall()
    except Exception:
        db.session.rollback()
        return []

    items = []
    for row in rows:
        m = row._mapping
        expiry_date = _date_from_row(m["expiry_date"])
        item_name = m["matched_name"] or m["name"]
        items.append({
            "name": item_name,
            "display_name": m["name"],
            "category": classify(item_name),
            "expiry_date": expiry_date.isoformat(),
            "days_until_expiry": (expiry_date - today).days,
            "price": _round_money(m["price"]),
        })
    return items


@bp.route("/cooked-meals", methods=["POST"])
def create_cooked_meal():
    try:
        _ensure_table()
        payload = request.get_json(silent=True) or {}

        recipe_name = (payload.get("recipe_name") or payload.get("name") or "").strip()
        if not recipe_name:
            return jsonify({"error": "recipe_name is required"}), 400

        try:
            recipe_id = _parse_int(payload.get("recipe_id"), "recipe_id")
            servings = _parse_float(payload.get("servings"), "servings", minimum=0)
            quantity_grams = _parse_float(payload.get("quantity_grams"), "quantity_grams")
            cooked_date = _parse_event_date(payload.get("cooked_date") or payload.get("event_date"))
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        serving_count = servings or 1
        serving_label = (
            f"{int(serving_count)} serving"
            if float(serving_count).is_integer() and serving_count == 1
            else f"{serving_count:g} servings"
        )
        metadata = payload.get("metadata") or {}

        inserted = db.session.execute(text("""
            INSERT INTO waste_events (
                user_id,
                recipe_id,
                recipe_name,
                item_name,
                category,
                event_type,
                quantity_grams,
                quantity_label,
                cost_impact,
                reason,
                metadata_json,
                event_date
            )
            VALUES (
                :user_id,
                :recipe_id,
                :recipe_name,
                :item_name,
                'meal',
                'cooked',
                :quantity_grams,
                :quantity_label,
                0,
                :notes,
                :metadata_json,
                :event_date
            )
            RETURNING *
        """), {
            "user_id": _parse_int(payload.get("user_id"), "user_id") or 1,
            "recipe_id": recipe_id,
            "recipe_name": recipe_name,
            "item_name": recipe_name,
            "quantity_grams": quantity_grams or 0,
            "quantity_label": serving_label,
            "notes": (payload.get("notes") or payload.get("reason") or "").strip() or None,
            "metadata_json": json.dumps(metadata),
            "event_date": cooked_date,
        }).fetchone()
        fridge_updates = _decrement_fridge_items(metadata.get("ingredient_usage") or [])
        db.session.commit()

        return jsonify({
            "cooked_meal": _cooked_meal_to_dict(inserted),
            "fridge_updates": fridge_updates,
        }), 201

    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 500


@bp.route("/cooked-meals", methods=["GET"])
def list_cooked_meals():
    try:
        _ensure_table()
        days = max(1, min(int(request.args.get("days", 30)), 365))
        start_date = date.today() - timedelta(days=days - 1)
        rows = db.session.execute(text("""
            SELECT *
            FROM waste_events
            WHERE event_type = 'cooked'
              AND event_date >= :start_date
            ORDER BY event_date DESC, created_at DESC
        """), {"start_date": start_date}).fetchall()
        cooked_meals = [_cooked_meal_to_dict(row) for row in rows]
        waste_history = _load_cooked_waste_history(
            [meal["event_id"] for meal in cooked_meals],
            start_date=start_date,
        )
        for meal in cooked_meals:
            meal["metadata"]["waste_history"] = waste_history.get(meal["event_id"], [])
        return jsonify({
            "cooked_meals": cooked_meals
        }), 200
    except ValueError:
        return jsonify({"error": "days must be an integer"}), 400
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 500


@bp.route("/events", methods=["POST"])
def create_waste_event():
    try:
        _ensure_table()
        payload = request.get_json(silent=True) or {}

        item_name = (payload.get("item_name") or payload.get("name") or "").strip()
        if not item_name:
            return jsonify({"error": "item_name is required"}), 400

        event_type = (payload.get("event_type") or "").strip().lower()
        if event_type not in EVENT_TYPES:
            return jsonify({
                "error": "event_type must be one of: cooked, saved_leftover, wasted, expired"
            }), 400

        try:
            event_date = _parse_event_date(payload.get("event_date"))
            quantity_grams = _parse_float(payload.get("quantity_grams"), "quantity_grams")
            cost_impact = _parse_float(payload.get("cost_impact"), "cost_impact")
            receipt_item_id = _parse_int(payload.get("receipt_item_id"), "receipt_item_id")
            recipe_id = _parse_int(payload.get("recipe_id"), "recipe_id")
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        category = (payload.get("category") or "").strip() or classify(item_name)

        metadata = payload.get("metadata") or {}

        inserted = db.session.execute(text("""
            INSERT INTO waste_events (
                user_id,
                receipt_item_id,
                recipe_id,
                recipe_name,
                item_name,
                category,
                event_type,
                quantity_grams,
                quantity_label,
                cost_impact,
                reason,
                metadata_json,
                event_date
            )
            VALUES (
                :user_id,
                :receipt_item_id,
                :recipe_id,
                :recipe_name,
                :item_name,
                :category,
                :event_type,
                :quantity_grams,
                :quantity_label,
                :cost_impact,
                :reason,
                :metadata_json,
                :event_date
            )
            RETURNING *
        """), {
            "user_id": _parse_int(payload.get("user_id"), "user_id") or 1,
            "receipt_item_id": receipt_item_id,
            "recipe_id": recipe_id,
            "recipe_name": (payload.get("recipe_name") or "").strip() or None,
            "item_name": item_name,
            "category": category,
            "event_type": event_type,
            "quantity_grams": quantity_grams or 0,
            "quantity_label": (payload.get("quantity_label") or "").strip() or None,
            "cost_impact": cost_impact or 0,
            "reason": (payload.get("reason") or "").strip() or None,
            "metadata_json": json.dumps(metadata),
            "event_date": event_date,
        }).fetchone()
        inventory_updates = []
        if (
            event_type in WASTE_EVENT_TYPES
            and receipt_item_id
            and quantity_grams
            and not metadata.get("skip_inventory_update")
        ):
            inventory_updates = _decrement_fridge_items([{
                "receipt_item_id": receipt_item_id,
                "grams_used": quantity_grams,
            }])
        db.session.commit()

        return jsonify({
            "event": _event_to_dict(inserted),
            "inventory_updates": inventory_updates,
        }), 201

    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 500


@bp.route("/events", methods=["GET"])
def list_waste_events():
    try:
        _ensure_table()
        days = max(1, min(int(request.args.get("days", 30)), 365))
        start_date = date.today() - timedelta(days=days - 1)
        rows = db.session.execute(text("""
            SELECT *
            FROM waste_events
            WHERE event_date >= :start_date
            ORDER BY event_date DESC, created_at DESC
        """), {"start_date": start_date}).fetchall()
        return jsonify({"events": [_event_to_dict(row) for row in rows]}), 200
    except ValueError:
        return jsonify({"error": "days must be an integer"}), 400
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 500


@bp.route("/analytics", methods=["GET"])
def get_waste_analytics():
    try:
        _ensure_table()
        days = max(1, min(int(request.args.get("days", 7)), 365))
    except ValueError:
        return jsonify({"error": "days must be an integer"}), 400
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 500

    today = date.today()
    current_start = today - timedelta(days=days - 1)
    previous_start = current_start - timedelta(days=days)
    previous_end = current_start - timedelta(days=1)

    try:
        rows = db.session.execute(text("""
            SELECT *
            FROM waste_events
            WHERE event_date >= :previous_start
              AND event_date <= :today
            ORDER BY event_date ASC, created_at ASC
        """), {
            "previous_start": previous_start,
            "today": today,
        }).fetchall()
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 500

    current_waste = []
    previous_waste = []
    current_cooked = []
    saved_events = []
    trends = _empty_trends(current_start, days)
    category_totals = defaultdict(lambda: {"weight_grams": 0.0, "cost_impact": 0.0})
    item_totals = defaultdict(lambda: {
        "category": "other",
        "times_wasted": 0,
        "weight_grams": 0.0,
        "cost_impact": 0.0,
    })

    for row in rows:
        event = dict(row._mapping)
        event_date = _date_from_row(event["event_date"])
        event_type = event["event_type"]
        grams = float(event["quantity_grams"] or 0)
        cost = float(event["cost_impact"] or 0)

        if event_date >= current_start and event_type == "cooked":
            try:
                metadata = json.loads(event.get("metadata_json") or "{}")
            except (TypeError, ValueError):
                metadata = {}
            cooked_event = {
                **event,
                "event_date": event_date.isoformat(),
                "created_at": (
                    event["created_at"].isoformat()
                    if hasattr(event["created_at"], "isoformat")
                    else str(event["created_at"])
                ),
                "quantity_grams": grams,
                "cost_impact": cost,
                "metadata": metadata,
            }
            current_cooked.append(cooked_event)

        if event_type in {"cooked", "saved_leftover"} and event_date >= current_start:
            saved_events.append(event)

        if event_type not in WASTE_EVENT_TYPES:
            continue

        if event_date < current_start:
            previous_waste.append(event)
            continue

        current_waste.append(event)
        category = event["category"] or classify(event["item_name"])
        category_totals[category]["weight_grams"] += grams
        category_totals[category]["cost_impact"] += cost

        key = " ".join(str(event["item_name"]).strip().lower().split())
        item_totals[key]["category"] = category
        item_totals[key]["times_wasted"] += 1
        item_totals[key]["weight_grams"] += grams
        item_totals[key]["cost_impact"] += cost

        day_key = event_date.isoformat()
        if day_key in trends:
            trends[day_key]["weight_grams"] += grams
            trends[day_key]["food_waste_kg"] = _round_kg(trends[day_key]["weight_grams"])
            trends[day_key]["weight_kg"] = trends[day_key]["food_waste_kg"]
            trends[day_key]["cost_impact"] = _round_money(trends[day_key]["cost_impact"] + cost)

    current_grams = sum(float(event["quantity_grams"] or 0) for event in current_waste)
    current_cost = sum(float(event["cost_impact"] or 0) for event in current_waste)
    previous_grams = sum(float(event["quantity_grams"] or 0) for event in previous_waste)
    saved_grams = sum(float(event["quantity_grams"] or 0) for event in saved_events)

    if previous_grams > 0:
        comparison_pct = round(((current_grams - previous_grams) / previous_grams) * 100, 1)
    else:
        comparison_pct = None

    breakdown = []
    for category, values in category_totals.items():
        grams = values["weight_grams"]
        breakdown.append({
            "category": category,
            "weight_grams": round(grams, 1),
            "weight_kg": _round_kg(grams),
            "cost_impact": _round_money(values["cost_impact"]),
            "percentage": round((grams / current_grams) * 100, 1) if current_grams else 0,
        })
    breakdown.sort(key=lambda item: (-item["weight_grams"], item["category"]))

    top_items = []
    for name, values in item_totals.items():
        top_items.append({
            "name": name,
            "category": values["category"],
            "times_wasted": values["times_wasted"],
            "weight_grams": round(values["weight_grams"], 1),
            "weight_kg": _round_kg(values["weight_grams"]),
            "cost_impact": _round_money(values["cost_impact"]),
        })
    top_items.sort(key=lambda item: (-item["cost_impact"], -item["weight_grams"], item["name"]))

    at_risk_items = _load_at_risk_items(today)
    insights = []
    if breakdown:
        top_category = breakdown[0]
        insights.append(
            f"Most waste is coming from {top_category['category']} ({top_category['percentage']}%)."
        )
    if comparison_pct is not None:
        if comparison_pct < 0:
            insights.append(f"Waste is down {abs(comparison_pct)}% compared with the previous period.")
        elif comparison_pct > 0:
            insights.append(f"Waste is up {comparison_pct}% compared with the previous period.")
    if at_risk_items:
        first = at_risk_items[0]
        insights.append(
            f"Use {first['name']} soon; it expires in {first['days_until_expiry']} day(s)."
        )
    if not insights:
        insights.append("No logged waste yet. Start logging cooked and wasted items to unlock insights.")

    cooked_meals = [
        _cooked_meal_from_event(event)
        for event in sorted(
            current_cooked,
            key=lambda item: (item["event_date"], item["created_at"]),
            reverse=True,
        )
    ]
    waste_history = _load_cooked_waste_history(
        [meal["event_id"] for meal in cooked_meals],
        start_date=current_start,
    )
    for meal in cooked_meals:
        meal["metadata"]["waste_history"] = waste_history.get(meal["event_id"], [])

    return jsonify({
        "period": {
            "days": days,
            "start_date": current_start.isoformat(),
            "end_date": today.isoformat(),
            "previous_start_date": previous_start.isoformat(),
            "previous_end_date": previous_end.isoformat(),
        },
        "weekly_summary": {
            "total_wasted_grams": round(current_grams, 1),
            "total_wasted_kg": _round_kg(current_grams),
            "money_lost": _round_money(current_cost),
            "co2_impact_kg": round((current_grams / 1000) * CO2_KG_PER_FOOD_KG, 2),
            "saved_from_waste_grams": round(saved_grams, 1),
            "saved_from_waste_kg": _round_kg(saved_grams),
            "comparison_to_last_period_pct": comparison_pct,
            "cooked_meal_count": len(current_cooked),
        },
        "cooked_meals": cooked_meals,
        "waste_breakdown": breakdown,
        "top_wasted_items": top_items[:6],
        "trends": list(trends.values()),
        "smart_insights": insights[:4],
        "at_risk_items": at_risk_items,
        "quick_actions": [
            {"key": "log_food_waste", "label": "Log Food Waste"},
            {"key": "recipes_for_expiring_items", "label": "View Recipes for Expiring Items"},
            {"key": "adjust_shopping_habits", "label": "Adjust Shopping Habits"},
        ],
    }), 200
