import os
import re
<<<<<<< HEAD
import shutil
import pandas as pd
import pytesseract
from PIL import Image, ImageOps, ImageFilter

IMAGE_PATH = "uploads/image.jpg"
KNOWN_ITEMS_PATH = "data/processed/known_ingredients.csv"
PREPROCESSED_PATH = "uploads/test_receipt_preprocessed.png"


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
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_weight(text):
    patterns = [
        r"(\d+(?:\.\d+)?)\s*(kg)\b",
        r"(\d+(?:\.\d+)?)\s*(g)\b",
        r"(\d+(?:\.\d+)?)\s*(l)\b",
        r"(\d+(?:\.\d+)?)\s*(ml)\b",
    ]

    for pattern in patterns:
        m = re.search(pattern, text)
        if m:
            value = float(m.group(1))
            unit = m.group(2)

            if unit == "kg":
                return f"{int(value * 1000)} g"
            elif unit == "g":
                return f"{int(value)} g"
            elif unit == "l":
                return f"{int(value * 1000)} ml"
            elif unit == "ml":
                return f"{int(value)} ml"

    return None


def extract_price(text):
    prices = re.findall(r"\$?\d+\.\d{2}\b", text)
    if prices:
        return prices[-1].replace("$", "")
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
    """
    Match receipt product name to ingredient/product names in CSV
    using token overlap.
    """
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

        # bonus if known item is contained in product text
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

        weight = extract_weight(line)
        price = extract_price(line)
        product_text = remove_weight_price(line)

        if not product_text:
            continue

        match_name, score = best_match_product_to_known(product_text, known_items)

        if match_name and score >= threshold and weight is not None:
            results.append({
                "raw_line": line,
                "matched_name": match_name,
                "weight": weight,
                "price": price,
                "score": round(score, 2)
    })

    return results


def main():
    tesseract_path = find_tesseract()
    if not tesseract_path:
        print("[ERROR] Tesseract not found. Install with: brew install tesseract")
        return

    pytesseract.pytesseract.tesseract_cmd = tesseract_path

    if not os.path.exists(IMAGE_PATH):
        print(f"[ERROR] Receipt image not found: {IMAGE_PATH}")
        return

    known_items = load_known_items()
    if not known_items:
        return

    image = Image.open(IMAGE_PATH)
    image = preprocess_image(image)
    image.save(PREPROCESSED_PATH)

    text = pytesseract.image_to_string(image, config="--psm 6")
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    print("\n========== OCR LINES ==========\n")
    for i, line in enumerate(lines, 1):
        print(f"{i}: {line}")

    results = parse_receipt_lines(lines, known_items, threshold=0.5)

    print("\n========== MATCHED ITEMS ==========\n")
    if not results:
        print("No matches found.")
    else:
        for item in results:
            print(item)

    print("\n========== END ==========\n")


if __name__ == "__main__":
    main()
=======
import cv2
import pandas as pd
import pytesseract
from rapidfuzz import process, fuzz


# ---------- CONFIG ----------
IMAGE_PATH = "uploads/image.jpg"      # change if needed
KNOWN_ITEMS_CSV = "known_items.csv"   # or set to None
OCR_THRESHOLD = 75

# If pytesseract cannot find tesseract, uncomment and set your path:
# pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"
# check with: which tesseract


def preprocess_receipt(image_bgr):
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=1.7, fy=1.7, interpolation=cv2.INTER_CUBIC)
    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    return gray, thresh


def run_ocr(image):
    config = "--oem 3 --psm 6"
    return pytesseract.image_to_string(image, config=config)


def split_lines(text):
    lines = [line.strip() for line in text.split("\n")]
    return [line for line in lines if line]


def load_known_items(csv_path):
    if not csv_path or not os.path.exists(csv_path):
        print("known_items.csv not found, running without fuzzy matching dataset")
        return []

    known_df = pd.read_c
>>>>>>> origin/main
