import os
import re
import shutil
import pandas as pd
import pytesseract
from PIL import Image, ImageOps, ImageFilter

KNOWN_ITEMS_PATH = "data/processed/known_ingredients.csv"


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
        r"\b(\d+(?:\.\d+)?)\s*(kg)\b",
        r"\b(\d+(?:\.\d+)?)\s*(g)\b",
        r"\b(\d+(?:\.\d+)?)\s*(l)\b",
        r"\b(\d+(?:\.\d+)?)\s*(ml)\b",
    ]

    for pattern in patterns:
        m = re.search(pattern, text)
        if m:
            value = m.group(1)
            unit = m.group(2)
            return f"{value} {unit}"

    return None


def remove_weight_price(text):
    text = re.sub(r"\$?\d+\.\d{2}\b", " ", text)
    text = re.sub(r"\b\d+(?:\.\d+)?\s*(kg|g|l|ml)\b", " ", text)
    text = re.sub(r"\bqty\b", " ", text)
    text = re.sub(r"\beach\b", " ", text)
    text = re.sub(r"\bp/p\b", " ", text)
    text = re.sub(r"\bbulk\b", " ", text)
    text = re.sub(r"\b\d+\b", " ", text)
    text = re.sub(r"[^a-z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


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
    bad_patterns = [
        "subtotal", "total", "gst", "saved", "credits", "approved", "debit",
        "mastercard", "purchase", "change", "taxable", "invoice", "coupon",
        "offers expire", "thank you", "visit", "abn", "term id", "card",
        "trans", "glen huntly", "woolworths group"
    ]
    line_lower = line.lower()
    return not any(bad in line_lower for bad in bad_patterns)


def parse_receipt_lines(lines, known_items, threshold=0.5):
    results = []

    for line in lines:
        line = clean_line(line)

        if not looks_like_product_line(line):
            continue

        qty = extract_qty(line)
        price = extract_price(line)
        product_text = remove_weight_price(line)

        if not product_text:
            continue

        match_name, score = best_match_product_to_known(product_text, known_items)

        if match_name and score >= threshold:
            results.append({
                "name": match_name,
                "qty": qty,
                "price": price
            })

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
    image = preprocess_image(image)

    text = pytesseract.image_to_string(image, config="--psm 6")
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    results = parse_receipt_lines(lines, known_items, threshold=0.5)
    return results
