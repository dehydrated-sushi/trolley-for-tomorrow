"""Dietary preference blocklists.

Each preference maps to a set of ingredient keywords that *disqualify* a recipe.
A single match excludes the recipe. Word-boundary matching is used so that
'ice' doesn't match 'rice' (see classifier._word_boundary_find).

Tradeoffs:
  - Conservative: errs on the side of excluding unclear recipes.
  - Based on ingredient names only — no label inspection.
  - Compound items like "coconut milk" contain "milk" → blocked for dairy-free.
    This is a deliberate false-positive to avoid serving unsafe recipes.
"""

from .classifier import _word_boundary_find

# Canonical preference keys
PREFERENCES = ("vegetarian", "vegan", "pescatarian", "gluten_free", "dairy_free", "nut_free")

# Human-readable labels for the frontend
PREFERENCE_LABELS = {
    "vegetarian":  "Vegetarian",
    "vegan":       "Vegan",
    "pescatarian": "Pescatarian",
    "gluten_free": "Gluten-free",
    "dairy_free":  "Dairy-free",
    "nut_free":    "Nut-free",
}

# Blocklists — keywords that, if found in a recipe's ingredients_clean,
# exclude the recipe.

_MEATS = {
    "chicken", "turkey", "beef", "pork", "lamb", "veal", "bacon", "ham",
    "sausage", "steak", "mince", "ribs", "brisket", "venison", "duck",
    "liver", "salami", "pepperoni", "chorizo", "prosciutto", "pancetta",
    "meat", "pastrami", "mutton", "goat",
}

_SEAFOOD = {
    "salmon", "tuna", "cod", "shrimp", "prawn", "scallop", "lobster",
    "crab", "oyster", "mussel", "clam", "anchovy", "sardine", "fish",
    "seafood", "calamari", "squid", "octopus", "bay bug", "crayfish", "yabby",
    "haddock", "halibut", "mackerel", "trout", "sole", "tilapia", "pollock",
}

_DAIRY = {
    "milk", "cheese", "butter", "yogurt", "yoghurt", "cream", "ghee",
    "whey", "curd", "custard", "kefir", "quark", "fromage", "paneer",
    "ricotta", "feta", "mozzarella", "parmesan", "cheddar", "brie",
    "camembert", "gouda", "provolone", "mascarpone", "cottage cheese",
}

_EGGS = {"egg"}

_HONEY = {"honey"}

_GLUTEN = {
    "wheat", "flour", "bread", "pasta", "noodle", "spaghetti", "macaroni",
    "penne", "linguine", "fettuccine", "rigatoni", "ravioli", "lasagna",
    "couscous", "barley", "rye", "bulgur", "semolina", "farro", "spelt",
    "bagel", "bun", "pita", "tortilla", "pretzel", "biscuit", "cracker",
    "dough", "challah", "baguette", "sourdough", "toast", "cake", "muffin",
    "pancake", "waffle", "croissant", "pastry", "cookie", "panko",
    "breadcrumb", "malt",
}

_NUTS = {
    "almond", "peanut", "cashew", "walnut", "pecan", "hazelnut", "pistachio",
    "macadamia", "pine nut", "brazil nut", "nut butter", "nutella",
    "marzipan",
}


# Mapping preference → keywords that exclude the recipe
BLOCKLISTS = {
    "vegetarian": _MEATS | _SEAFOOD,
    "vegan":      _MEATS | _SEAFOOD | _DAIRY | _EGGS | _HONEY,
    "pescatarian": _MEATS,  # fish allowed
    "gluten_free": _GLUTEN,
    "dairy_free": _DAIRY,
    "nut_free":   _NUTS,
}


def is_recipe_allowed(ingredients_raw, active_prefs):
    """Return True if the recipe passes ALL active dietary preferences.

    ingredients_raw: pipe-separated ingredients string (recipes.ingredients_clean)
    active_prefs: iterable of preference keys (e.g. ['vegetarian', 'gluten_free'])
    """
    if not active_prefs:
        return True

    text = (ingredients_raw or "").lower()
    if not text:
        # No ingredients = can't evaluate = exclude to be safe
        return False

    for pref in active_prefs:
        blocklist = BLOCKLISTS.get(pref)
        if not blocklist:
            continue
        for banned in blocklist:
            if _word_boundary_find(banned, text):
                return False

    return True


def sql_exclude_clause(active_prefs, param_prefix="d"):
    """Build a SQL fragment that pre-filters recipes to exclude any with
    banned keywords. Returns (sql_fragment, params_dict).

    Uses `NOT (ingredients_clean LIKE '%...%' OR ...)` per preference.
    Because LIKE can't do word boundaries, we over-exclude here and then
    validate finely in Python via is_recipe_allowed.
    """
    if not active_prefs:
        return "", {}

    all_banned = set()
    for pref in active_prefs:
        all_banned |= BLOCKLISTS.get(pref, set())

    if not all_banned:
        return "", {}

    clauses = []
    params = {}
    for i, kw in enumerate(sorted(all_banned)):
        p = f"{param_prefix}{i}"
        clauses.append(f"ingredients_clean LIKE :{p}")
        params[p] = f"%{kw}%"

    # Recipe passes if NONE of the banned keywords appear
    return f"NOT ({' OR '.join(clauses)})", params
