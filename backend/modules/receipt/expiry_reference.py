import csv
import re
import unicodedata
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path

from modules.nutrition.classifier import classify


BACKEND_DIR = Path(__file__).resolve().parents[2]
FOOD_REFERENCE_CSV = BACKEND_DIR / "data" / "processed" / "food_reference.csv"

CATEGORY_FALLBACK_DAYS = {
    "protein": 3,
    "vegetables": 7,
    "fruits": 7,
    "grains": 14,
    "fats": 30,
    "healthy_fats": 30,
    "beverages": 7,
    "other": 7,
}

TOKEN_STOPWORDS = {
    "coles",
    "woolworths",
    "woolworth",
    "woolies",
    "aldi",
    "iga",
    "ww",
    "fresh",
    "organic",
    "brand",
    "homebrand",
    "select",
    "macro",
    "pack",
    "pkt",
    "pkg",
    "bag",
}


def _clean_text(value):
    if value is None:
        return ""
    text = unicodedata.normalize("NFKD", str(value).lower())
    text = text.encode("ascii", errors="ignore").decode("ascii")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _singular_token(token):
    if len(token) > 4 and token.endswith("ies"):
        return token[:-3] + "y"
    if len(token) > 4 and token.endswith(("ches", "shes", "xes", "zes")):
        return token[:-2]
    if len(token) > 3 and token.endswith("s"):
        return token[:-1]
    return token


def _match_key(value):
    tokens = []
    for token in _clean_text(value).split():
        if len(token) <= 1 or token in TOKEN_STOPWORDS:
            continue
        tokens.append(_singular_token(token))
    return " ".join(tokens)


def _int_or_none(value):
    if value in (None, ""):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _preferred_refrigerated_days(row):
    return (
        _int_or_none(row.get("refrigerate_max_days"))
        or _int_or_none(row.get("refrigerate_min_days"))
    )


def _reference_priority(row):
    return (
        1 if row["refrigerated_days"] is not None else 0,
        row.get("expiry_match_score") or 0,
        -len(row["ingredient_key"].split()),
    )


@lru_cache(maxsize=1)
def _load_reference():
    by_ingredient = {}
    by_canonical = {}
    rows = []

    if not FOOD_REFERENCE_CSV.exists():
        return by_ingredient, by_canonical, rows

    with FOOD_REFERENCE_CSV.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for source_row in reader:
            ingredient_name = source_row.get("ingredient_name", "")
            canonical_name = source_row.get("canonical_name", "")
            ingredient_key = _match_key(ingredient_name)
            canonical_key = _match_key(canonical_name or ingredient_name)
            refrigerated_days = _preferred_refrigerated_days(source_row)

            try:
                expiry_match_score = float(source_row.get("expiry_match_score") or 0)
            except (TypeError, ValueError):
                expiry_match_score = 0

            row = {
                "ingredient_name": ingredient_name,
                "canonical_name": canonical_name,
                "ingredient_key": ingredient_key,
                "canonical_key": canonical_key,
                "refrigerated_days": refrigerated_days,
                "expiry_match_score": expiry_match_score,
                "foodkeeper_name": source_row.get("foodkeeper_name", ""),
            }
            rows.append(row)

            if ingredient_key:
                existing = by_ingredient.get(ingredient_key)
                if existing is None or _reference_priority(row) > _reference_priority(existing):
                    by_ingredient[ingredient_key] = row
            if canonical_key:
                existing = by_canonical.get(canonical_key)
                if existing is None or _reference_priority(row) > _reference_priority(existing):
                    by_canonical[canonical_key] = row

    return by_ingredient, by_canonical, rows


def _reference_match(name, matched_name=None):
    by_ingredient, by_canonical, rows = _load_reference()
    query_values = [matched_name, name]

    for value in query_values:
        key = _match_key(value)
        if not key:
            continue

        for index in (by_ingredient, by_canonical):
            row = index.get(key)
            if row and row["refrigerated_days"] is not None:
                return row

        padded_key = f" {key} "
        best = None
        for row in rows:
            days = row["refrigerated_days"]
            row_key = row["canonical_key"] or row["ingredient_key"]
            if days is None or not row_key:
                continue
            if f" {row_key} " not in padded_key:
                continue
            score = (len(row_key.split()), row["expiry_match_score"])
            if best is None or score > best[0]:
                best = (score, row)

        if best:
            return best[1]

    return None


def estimate_expiry_date(name, matched_name=None, today=None):
    today = today or date.today()
    row = _reference_match(name, matched_name=matched_name)
    if row:
        return today + timedelta(days=row["refrigerated_days"])

    category = classify(matched_name or name)
    fallback_days = CATEGORY_FALLBACK_DAYS.get(category)
    if fallback_days is None:
        return None
    return today + timedelta(days=fallback_days)
