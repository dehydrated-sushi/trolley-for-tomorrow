"""Ingredient → nutritional category classifier.

Keyword-first approach: we scan the ingredient name for category-defining
keywords ordered from most-specific to most-general. The first match wins.

Categories:
  - protein       : teal
  - grains        : sandy yellow
  - vegetables    : purple
  - fats          : blue
  - fruits        : pink
  - beverages     : indigo    (drinks — alcoholic and non-alcoholic, water, juice)
  - other         : neutral   (condiments, sauces, seasonings, unclassified)
"""

# Order matters: more specific keywords before general ones.
# Each entry is (substring-to-find-in-ingredient-name, category).
# Matching is done with word-boundary check to avoid false positives
# (e.g., "ice" shouldn't match "rice").

RULES = [
    # === Beverages (placed first so drink-specific names take precedence
    #     before keyword overlap with other categories, e.g. "ginger ale"
    #     shouldn't match "ginger" → vegetables) ===
    # alcoholic
    ("wine", "beverages"),
    ("beer", "beverages"),
    ("ale", "beverages"),
    ("lager", "beverages"),
    ("stout", "beverages"),
    ("guinness", "beverages"),
    ("cider", "beverages"),
    ("prosecco", "beverages"),
    ("champagne", "beverages"),
    ("vodka", "beverages"),
    ("whiskey", "beverages"),
    ("whisky", "beverages"),
    ("rum", "beverages"),
    ("gin", "beverages"),
    ("tequila", "beverages"),
    ("brandy", "beverages"),
    ("cognac", "beverages"),
    ("bourbon", "beverages"),
    ("sake", "beverages"),
    ("mirin", "beverages"),
    ("lillet", "beverages"),
    ("vermouth", "beverages"),
    ("absinthe", "beverages"),
    ("schnapps", "beverages"),
    ("sangria", "beverages"),
    ("margarita", "beverages"),
    ("martini", "beverages"),
    ("cocktail", "beverages"),
    ("liqueur", "beverages"),
    ("amaretto", "beverages"),
    ("sherry", "beverages"),
    ("port wine", "beverages"),
    # non-alcoholic
    ("cola", "beverages"),
    ("coke", "beverages"),
    ("pepsi", "beverages"),
    ("soda", "beverages"),
    ("lemonade", "beverages"),
    ("kool aid", "beverages"),
    ("kool-aid", "beverages"),
    ("gatorade", "beverages"),
    ("tea", "beverages"),
    ("coffee", "beverages"),
    ("espresso", "beverages"),
    ("latte", "beverages"),
    ("cappuccino", "beverages"),
    ("cocoa", "beverages"),
    ("hot chocolate", "beverages"),
    ("juice", "beverages"),
    ("smoothie", "beverages"),
    ("kombucha", "beverages"),
    ("water", "beverages"),
    ("ice", "beverages"),  # typically implies iced drinks in recipes
    ("ginger ale", "beverages"),
    ("root beer", "beverages"),
    ("tonic", "beverages"),
    ("drink", "beverages"),
    ("beverage", "beverages"),
    ("punch", "beverages"),
    ("iced tea", "beverages"),
    ("iced coffee", "beverages"),
    ("sparkling water", "beverages"),
    ("mineral water", "beverages"),
    ("carbonated", "beverages"),

    # === Exceptions (compound names that would be mis-classified) ===
    ("peanut butter", "fats"),
    ("almond butter", "fats"),
    ("cashew butter", "fats"),
    ("coconut oil", "fats"),
    ("coconut milk", "fats"),
    ("coconut cream", "fats"),
    ("nut butter", "fats"),

    # === Proteins ===
    # meats
    ("chicken", "protein"),
    ("turkey", "protein"),
    ("beef", "protein"),
    ("pork", "protein"),
    ("lamb", "protein"),
    ("veal", "protein"),
    ("bacon", "protein"),
    ("ham", "protein"),
    ("sausage", "protein"),
    ("steak", "protein"),
    ("mince", "protein"),
    ("ground beef", "protein"),
    ("ground turkey", "protein"),
    ("ribs", "protein"),
    ("brisket", "protein"),
    ("venison", "protein"),
    ("duck", "protein"),
    ("liver", "protein"),
    ("salami", "protein"),
    ("pepperoni", "protein"),
    ("chorizo", "protein"),
    ("prosciutto", "protein"),
    # seafood
    ("salmon", "protein"),
    ("tuna", "protein"),
    ("cod", "protein"),
    ("shrimp", "protein"),
    ("prawn", "protein"),
    ("scallop", "protein"),
    ("lobster", "protein"),
    ("crab", "protein"),
    ("oyster", "protein"),
    ("mussel", "protein"),
    ("clam", "protein"),
    ("anchovy", "protein"),
    ("sardine", "protein"),
    ("fish", "protein"),
    ("seafood", "protein"),
    ("calamari", "protein"),
    ("squid", "protein"),
    ("octopus", "protein"),
    ("bay bug", "protein"),
    ("bay bugs", "protein"),
    ("crayfish", "protein"),
    ("yabby", "protein"),
    # eggs / dairy proteins (dairy fats and proteins → protein per "highest macro" rule)
    ("egg", "protein"),
    ("yogurt", "protein"),
    ("yoghurt", "protein"),
    ("cottage cheese", "protein"),
    ("cheese", "protein"),
    ("milk", "protein"),
    ("cream", "protein"),  # heavy cream etc → still protein per "highest" — caution: "cream" appears in many
    ("fromage", "protein"),
    ("paneer", "protein"),
    ("ricotta", "protein"),
    ("feta", "protein"),
    ("mozzarella", "protein"),
    ("parmesan", "protein"),
    ("cheddar", "protein"),
    # plant proteins
    ("tofu", "protein"),
    ("tempeh", "protein"),
    ("seitan", "protein"),
    ("edamame", "protein"),
    ("lentil", "protein"),
    ("chickpea", "protein"),
    ("garbanzo", "protein"),
    ("kidney bean", "protein"),
    ("black bean", "protein"),
    ("pinto bean", "protein"),
    ("cannellini", "protein"),
    ("lima bean", "protein"),
    ("navy bean", "protein"),
    ("split pea", "protein"),
    ("soy bean", "protein"),
    ("soybean", "protein"),

    # === Grains & Carbohydrates ===
    ("bread", "grains"),
    ("pasta", "grains"),
    ("noodle", "grains"),
    ("spaghetti", "grains"),
    ("macaroni", "grains"),
    ("penne", "grains"),
    ("linguine", "grains"),
    ("fettuccine", "grains"),
    ("rigatoni", "grains"),
    ("ravioli", "grains"),
    ("lasagna", "grains"),
    ("couscous", "grains"),
    ("quinoa", "grains"),
    ("rice", "grains"),
    ("oats", "grains"),
    ("oatmeal", "grains"),
    ("cereal", "grains"),
    ("barley", "grains"),
    ("millet", "grains"),
    ("bulgur", "grains"),
    ("semolina", "grains"),
    ("cornmeal", "grains"),
    ("polenta", "grains"),
    ("tortilla", "grains"),
    ("bagel", "grains"),
    ("bun", "grains"),
    ("roll", "grains"),
    ("pita", "grains"),
    ("cracker", "grains"),
    ("pretzel", "grains"),
    ("biscuit", "grains"),
    ("flour", "grains"),
    ("dough", "grains"),
    ("challah", "grains"),
    ("baguette", "grains"),
    ("sourdough", "grains"),
    ("toast", "grains"),
    ("cake", "grains"),
    ("muffin", "grains"),
    ("pancake", "grains"),
    ("waffle", "grains"),
    ("croissant", "grains"),
    ("pie crust", "grains"),
    ("pastry", "grains"),
    ("cookie", "grains"),
    ("wheat", "grains"),
    ("rye", "grains"),
    # starchy veg classified as grains/carbs per common practice
    ("potato", "grains"),
    ("sweet potato", "grains"),
    ("yam", "grains"),

    # === Vegetables ===
    ("spinach", "vegetables"),
    ("kale", "vegetables"),
    ("lettuce", "vegetables"),
    ("arugula", "vegetables"),
    ("rocket", "vegetables"),
    ("chard", "vegetables"),
    ("collard", "vegetables"),
    ("cabbage", "vegetables"),
    ("broccoli", "vegetables"),
    ("cauliflower", "vegetables"),
    ("brussels sprout", "vegetables"),
    ("carrot", "vegetables"),
    ("celery", "vegetables"),
    ("onion", "vegetables"),
    ("shallot", "vegetables"),
    ("leek", "vegetables"),
    ("garlic", "vegetables"),
    ("ginger", "vegetables"),
    ("pepper", "vegetables"),  # bell pepper, capsicum, etc — but "black pepper" the spice gets "other" via later rule
    ("capsicum", "vegetables"),
    ("chili", "vegetables"),
    ("chilli", "vegetables"),
    ("chile", "vegetables"),
    ("jalapeno", "vegetables"),
    ("tomato", "vegetables"),
    ("cucumber", "vegetables"),
    ("zucchini", "vegetables"),
    ("courgette", "vegetables"),
    ("squash", "vegetables"),
    ("pumpkin", "vegetables"),
    ("eggplant", "vegetables"),
    ("aubergine", "vegetables"),
    ("mushroom", "vegetables"),
    ("asparagus", "vegetables"),
    ("artichoke", "vegetables"),
    ("beet", "vegetables"),
    ("radish", "vegetables"),
    ("turnip", "vegetables"),
    ("parsnip", "vegetables"),
    ("okra", "vegetables"),
    ("green bean", "vegetables"),
    ("snow pea", "vegetables"),
    ("snap pea", "vegetables"),
    ("corn", "vegetables"),
    ("pea", "vegetables"),
    ("scallion", "vegetables"),
    ("watercress", "vegetables"),
    ("endive", "vegetables"),
    ("fennel", "vegetables"),
    ("bok choy", "vegetables"),
    ("veg", "vegetables"),
    ("herb", "vegetables"),
    ("basil", "vegetables"),
    ("parsley", "vegetables"),
    ("cilantro", "vegetables"),
    ("coriander", "vegetables"),
    ("mint", "vegetables"),
    ("thyme", "vegetables"),
    ("rosemary", "vegetables"),
    ("sage", "vegetables"),
    ("oregano", "vegetables"),
    ("dill", "vegetables"),
    ("chive", "vegetables"),

    # === Healthy Fats ===
    ("olive oil", "fats"),
    ("avocado", "fats"),
    ("almond", "fats"),
    ("walnut", "fats"),
    ("pecan", "fats"),
    ("cashew", "fats"),
    ("hazelnut", "fats"),
    ("pistachio", "fats"),
    ("macadamia", "fats"),
    ("pine nut", "fats"),
    ("brazil nut", "fats"),
    ("chia", "fats"),
    ("flax", "fats"),
    ("flaxseed", "fats"),
    ("hemp seed", "fats"),
    ("sesame seed", "fats"),
    ("sesame oil", "fats"),
    ("sunflower seed", "fats"),
    ("pumpkin seed", "fats"),
    ("coconut", "fats"),
    ("tahini", "fats"),
    ("peanut", "fats"),
    ("butter", "fats"),
    ("margarine", "fats"),
    ("ghee", "fats"),
    ("lard", "fats"),
    ("olive", "fats"),

    # === Fruits ===
    ("apple", "fruits"),
    ("banana", "fruits"),
    ("orange", "fruits"),
    ("lemon", "fruits"),
    ("lime", "fruits"),
    ("grapefruit", "fruits"),
    ("mandarin", "fruits"),
    ("tangerine", "fruits"),
    ("strawberry", "fruits"),
    ("blueberry", "fruits"),
    ("raspberry", "fruits"),
    ("blackberry", "fruits"),
    ("cranberry", "fruits"),
    ("grape", "fruits"),
    ("watermelon", "fruits"),
    ("melon", "fruits"),
    ("cantaloupe", "fruits"),
    ("honeydew", "fruits"),
    ("pineapple", "fruits"),
    ("mango", "fruits"),
    ("papaya", "fruits"),
    ("peach", "fruits"),
    ("pear", "fruits"),
    ("plum", "fruits"),
    ("cherry", "fruits"),
    ("apricot", "fruits"),
    ("nectarine", "fruits"),
    ("pomegranate", "fruits"),
    ("kiwi", "fruits"),
    ("fig", "fruits"),
    ("date", "fruits"),
    ("raisin", "fruits"),
    ("prune", "fruits"),
    ("currant", "fruits"),
    ("passion fruit", "fruits"),
    ("guava", "fruits"),
    ("lychee", "fruits"),
    ("dragon fruit", "fruits"),
    ("persimmon", "fruits"),
    ("berry", "fruits"),
    ("fruit", "fruits"),
]

# All defined categories with display metadata (legend source of truth)
CATEGORIES = {
    "protein": {
        "label": "Protein",
        "colour": "#14b8a6",     # teal
        "bg": "#ccfbf1",
        "icon": "egg",
        "description": "Meat, fish, eggs, dairy, legumes",
    },
    "grains": {
        "label": "Grains & Carbs",
        "colour": "#b45309",     # sandy yellow / amber
        "bg": "#fef3c7",
        "icon": "grain",
        "description": "Bread, rice, pasta, cereals, potatoes",
    },
    "vegetables": {
        "label": "Vegetables",
        "colour": "#a855f7",     # purple
        "bg": "#f3e8ff",
        "icon": "eco",
        "description": "Leafy greens, roots, herbs, mushrooms",
    },
    "fats": {
        "label": "Healthy Fats",
        "colour": "#2563eb",     # blue
        "bg": "#dbeafe",
        "icon": "opacity",
        "description": "Nuts, seeds, avocado, olive oil",
    },
    "fruits": {
        "label": "Fruits",
        "colour": "#ec4899",     # pink
        "bg": "#fce7f3",
        "icon": "nutrition",
        "description": "Fresh and dried fruits",
    },
    "beverages": {
        "label": "Beverages",
        "colour": "#6366f1",     # indigo
        "bg": "#e0e7ff",
        "icon": "local_bar",
        "description": "Drinks — alcohol, soft drinks, tea, coffee, juice, water",
    },
    "other": {
        "label": "Other",
        "colour": "#6b7280",     # neutral grey
        "bg": "#f3f4f6",
        "icon": "category",
        "description": "Drinks, condiments, seasonings, unclassified",
    },
}


def _is_right_boundary(haystack, end):
    """Allow common English plural suffixes as a boundary.
    e.g. 'onion' matches 'onions', 'berry' matches 'berries'."""
    if end == len(haystack):
        return True
    c1 = haystack[end]
    if not c1.isalpha():
        return True
    # allow trailing 's'
    if c1 == "s":
        if end + 1 == len(haystack) or not haystack[end + 1].isalpha():
            return True
    # allow trailing 'es'
    if c1 == "e" and end + 1 < len(haystack) and haystack[end + 1] == "s":
        if end + 2 == len(haystack) or not haystack[end + 2].isalpha():
            return True
    return False


def _strip_plural(word):
    """Normalise trivial plurals: berries→berry, tomatoes→tomato, apples→apple."""
    if word.endswith("ies") and len(word) > 3:
        return word[:-3] + "y"
    if word.endswith("es") and len(word) > 3:
        return word[:-2]
    if word.endswith("s") and len(word) > 2:
        return word[:-1]
    return word


def _word_boundary_find(needle, haystack):
    """Return True if needle appears in haystack at a word boundary.
    Trailing 's' / 'es' counts as a boundary (English plurals)."""
    pos = haystack.find(needle)
    while pos != -1:
        left_ok = (pos == 0) or (not haystack[pos - 1].isalpha())
        end = pos + len(needle)
        right_ok = _is_right_boundary(haystack, end)
        if left_ok and right_ok:
            return True
        pos = haystack.find(needle, pos + 1)
    return False


def classify(ingredient_name):
    """Return one of: protein, grains, vegetables, fats, fruits, other."""
    if not ingredient_name:
        return "other"

    name = ingredient_name.strip().lower()
    if not name:
        return "other"

    for keyword, category in RULES:
        if _word_boundary_find(keyword, name):
            return category

    # Fallback: singularise each word in the input and retry
    singular_tokens = [_strip_plural(t) for t in name.split()]
    singular_name = " ".join(singular_tokens)
    if singular_name != name:
        for keyword, category in RULES:
            if _word_boundary_find(keyword, singular_name):
                return category

    return "other"
