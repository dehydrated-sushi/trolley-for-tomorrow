import os
import re
import shutil
from pathlib import Path
import pandas as pd
import pytesseract
from PIL import Image, ImageOps, ImageFilter
from pillow_heif import register_heif_opener
register_heif_opener()

KNOWN_ITEMS_PATH = Path(__file__).resolve().parents[2] / "data" / "processed" / "known_ingredients.csv"

FOOTER_START_PATTERNS = [
    r"\bsub\s*total\b",
    r"\bsubtotal\b",
    r"\btotal\b",
    r"\bamount\s+due\b",
    r"\bbalance\s+due\b",
    r"\bcard\s+payment\b",
    r"\bpayment\b",
    r"\bpaid\b",
    r"\btender\b",
]

NON_PRODUCT_PATTERNS = [
    "gst", "saved", "credits", "approved", "debit", "credit", "eftpos",
    "mastercard", "visa", "purchase", "change", "taxable", "invoice",
    "coupon", "offers expire", "thank you", "visit", "abn", "term id",
    "card", "trans", "glen huntly", "woolworths group", "flybuys",
    "everyday rewards", "rewards", "member", "points", "receipt",
    "promotional price", "promotion", "promo",
]


def find_tesseract():
    possible_paths = [
        "/opt/homebrew/bin/tesseract",
        "/usr/local/bin/tesseract",
    ]
    for path in possible_paths:
        if os.path.exists(path):
            return path
    return shutil.which("tesseract")


def preprocess_image(image):
    image = image.convert("L")
    image = ImageOps.autocontrast(image)
    image = image.filter(ImageFilter.SHARPEN)
    return image


def load_known_items():
    if not os.path.exists(KNOWN_ITEMS_PATH):
        print(f"[ERROR] File not found: {KNOWN_ITEMS_PATH}")
        return []

    df = pd.read_csv(KNOWN_ITEMS_PATH)

    if "name" in df.columns:
        items = df["name"].dropna().astype(str).str.lower().str.strip().tolist()
    else:
        items = df.iloc[:, 0].dropna().astype(str).str.lower().str.strip().tolist()

    items = list(set(items))
    print(f"[INFO] Loaded {len(items)} known items")
    return items


def clean_line(text):
    text = text.lower()
    text = re.sub(r"[\"'#©“”]", " ", text)
    text = re.sub(r"\b(\d{2,4})6\b", r"\1g", text)  # 2006 -> 200g
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_price(text):
    prices = re.findall(r"\$?\d+\.\d{2}\b", text)
    if prices:
        return float(prices[-1].replace("$", ""))
    return None


def extract_qty(text):
    text = text.lower().strip()

    patterns = [
        r"\bqty\s*[:x]?\s*(\d+(?:\.\d+)?)\b",
        r"\b(\d+(?:\.\d+)?)\s*[x@]\s*\$?\d+\.\d{2}\b",
        r"\b(\d+(?:\.\d+)?)\s*(pack|pk|pcs|pieces|each|ea)\b",
        r"\b(\d+(?:\.\d+)?)\s*(kg|g|l|ml)\b",
    ]

    for pattern in patterns:
        m = re.search(pattern, text)
        if m:
            value = m.group(1)
            unit = m.group(2) if len(m.groups()) > 1 else "each"
            if unit == "pk":
                unit = "pack"
            if unit == "ea":
                unit = "each"
            return f"{value} {unit}"

    return None


def remove_weight_price(text):
    text = re.sub(r"\$?\d+\.\d{2}\b", " ", text)
    text = re.sub(r"\bqty\s*[:x]?\s*\d+(?:\.\d+)?\b", " ", text)
    text = re.sub(r"\b\d+(?:\.\d+)?\s*[x@]\b", " ", text)
    text = re.sub(r"\b\d+(?:\.\d+)?\s*(kg|g|l|ml|pack|pk|pcs|pieces|each|ea)\b", " ", text)
    text = re.sub(r"\bp/p\b", " ", text)
    text = re.sub(r"\bbulk\b", " ", text)
    text = re.sub(r"\b\d+\b", " ", text)
    text = re.sub(r"[^a-z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def format_product_name(text):
    acronyms = {
        "ww": "WW",
        "bbq": "BBQ",
        "uht": "UHT",
        "a2": "A2",
    }

    words = []
    for word in str(text).split():
        lower = word.lower()
        words.append(acronyms.get(lower, lower.capitalize()))

    return " ".join(words)


def normalize_tokens(text):
    stopwords = {
        "ww", "woolworths", "rspca", "large", "small", "bulk", "no", "sugar",
        "soft", "drink", "sweet", "red", "on", "rst", "tmt", "ball", "fillets"
    }
    tokens = [t for t in text.split() if t not in stopwords and len(t) > 1]
    return tokens


def best_match_product_to_known(product_text, known_items):
    product_tokens = set(normalize_tokens(product_text))
    if not product_tokens:
        return None, 0

    best_item = None
    best_score = 0

    for item in known_items:
        item_tokens = set(normalize_tokens(item))
        if not item_tokens:
            continue

        overlap = len(product_tokens & item_tokens)
        score = overlap / max(len(item_tokens), 1)

        if item in product_text:
            score += 1

        if score > best_score:
            best_score = score
            best_item = item

    return best_item, best_score


def looks_like_product_line(line):
    line_lower = line.lower()
    return not any(bad in line_lower for bad in NON_PRODUCT_PATTERNS)


def is_footer_start_line(line):
    line = clean_line(line)
    return any(re.search(pattern, line) for pattern in FOOTER_START_PATTERNS)


def parse_receipt_lines(lines, known_items, threshold=0.5):
    results = []
    seen = set()

    for line in lines:
        line = clean_line(line)

        if is_footer_start_line(line):
            break

        if not looks_like_product_line(line):
            continue

        qty = extract_qty(line)
        price = extract_price(line)
        product_text = remove_weight_price(line)

        if not product_text:
            continue

        match_name, score = best_match_product_to_known(product_text, known_items)
        key = match_name if match_name and score >= threshold else product_text
        key = re.sub(r"\s+", " ", key.strip().lower())
        if key in seen:
            continue

        if match_name and score >= threshold:
            results.append({
                "name": format_product_name(product_text),
                "matched_name": match_name,
                "match_score": round(score, 3),
                "qty": qty,
                "price": price
            })
            seen.add(key)
        elif price is not None and len(product_text) >= 3:
            results.append({
                "name": format_product_name(product_text),
                "qty": qty,
                "price": price,
            })
            seen.add(key)

    return results


def process_receipt(image_path):
    tesseract_path = find_tesseract()
    if not tesseract_path:
        raise RuntimeError("Tesseract not found. Install with: brew install tesseract")

    pytesseract.pytesseract.tesseract_cmd = tesseract_path

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Receipt image not found: {image_path}")

    known_items = load_known_items()
    if not known_items:
        raise RuntimeError("No known items loaded from CSV")

    image = Image.open(image_path)
    image = ImageOps.exif_transpose(image)
    image = image.convert("RGB")
    image = preprocess_image(image)

    text = pytesseract.image_to_string(image, config="--psm 6")
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    results = parse_receipt_lines(lines, known_items, threshold=0.5)
    return results
