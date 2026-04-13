import os
import re

# Heavy deps (opencv, pandas, …) are imported inside functions so ``import app``
# stays light for production WSGI workers and platforms with tight build limits.

OCR_THRESHOLD = 75


def preprocess_receipt(image_bgr):
    import cv2

    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=1.7, fy=1.7, interpolation=cv2.INTER_CUBIC)
    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    return gray, thresh


def run_ocr(image):
    import pytesseract

    config = "--oem 3 --psm 6"
    return pytesseract.image_to_string(image, config=config)


def split_lines(text):
    lines = [line.strip() for line in text.split("\n")]
    return [line for line in lines if line]


def load_known_items(csv_path=None):
    import pandas as pd

    if not csv_path or not os.path.exists(csv_path):
        return []

    known_df = pd.read_csv(csv_path)

    if "ingredient" in known_df.columns:
        known_df["item_name_clean"] = known_df["ingredient"].astype(str).str.lower().str.strip()
    elif "item_name" in known_df.columns:
        known_df["item_name_clean"] = known_df["item_name"].astype(str).str.lower().str.strip()
    elif "name" in known_df.columns:
        known_df["item_name_clean"] = known_df["name"].astype(str).str.lower().str.strip()
    else:
        return []

    return known_df["item_name_clean"].dropna().tolist()


def clean_product_name(line):
    line = line.lower().strip()
    line = line.replace("@", "0")
    line = re.sub(r"^[#\*\s]+", "", line)
    line = re.sub(r"\s+\$?\d+\.\d{2}\s*$", "", line)
    line = re.sub(r"\b\d+(\.\d+)?\s?(g|kg|ml|l)\b", " ", line)
    line = re.sub(r"\b\d+\b", " ", line)

    noise_words = ["qty", "each", "promo", "promotional", "price", "bulk", "p/p"]
    for word in noise_words:
        line = re.sub(rf"\b{re.escape(word)}\b", " ", line)

    line = re.sub(r"[^a-zA-Z\s]", " ", line)
    line = re.sub(r"\s+", " ", line).strip()
    return line


def extract_quantity(current_line, next_line=None):
    text = current_line.lower()

    m = re.search(r"\bqty\s*(\d+)\b", text)
    if m:
        return int(m.group(1))

    if next_line:
        next_text = next_line.lower()
        m = re.search(r"\bqty\s*(\d+)\b", next_text)
        if m:
            return int(m.group(1))

    return 1


def extract_weight_unit(line):
    text = line.lower().replace("@", "0")
    m = re.search(r"(\d+(?:\.\d+)?)\s*(g|kg|ml|l)\b", text)
    if m:
        return float(m.group(1)), m.group(2)
    return None, None


def normalize_weight(value, unit):
    if value is None or unit is None:
        return None

    if unit == "kg":
        return value * 1000
    if unit == "g":
        return value
    if unit == "l":
        return value * 1000
    if unit == "ml":
        return value

    return None


def is_junk_line(line):
    line_l = line.lower().strip()

    junk_keywords = [
        "tax invoice", "subtotal", "total", "woolworths", "glen huntly",
        "merch id", "debit", "mastercard", "aid", "tyr", "arqc", "atc",
        "psn", "term id", "card", "purchase", "approved", "change",
        "gst", "you saved", "cookware", "bonus credits", "thank you",
        "trans", "group limited", "coupon", "offers", "bws", "visit",
        "abn", "description", "promotional price"
    ]

    if not line_l:
        return True

    if any(word in line_l for word in junk_keywords):
        return True

    if re.fullmatch(r"[\d\s\$\.\,\:\-\/@€]+", line_l):
        return True

    return False


def match_known_name(cleaned_name, known_names, threshold=80):
    from rapidfuzz import fuzz, process

    if not cleaned_name or not known_names:
        return None, None

    best = process.extractOne(cleaned_name, known_names, scorer=fuzz.partial_ratio)
    if best and best[1] >= threshold:
        return best[0], best[1]

    return None, None


def extract_receipt_items(raw_lines, known_names, threshold=80):
    import pandas as pd

    results = []
    used_qty_lines = set()

    for i, line in enumerate(raw_lines):
        if i in used_qty_lines:
            continue

        if is_junk_line(line):
            continue

        next_line = raw_lines[i + 1] if i + 1 < len(raw_lines) else None

        if line.lower().startswith("qty"):
            continue

        qty = extract_quantity(line, next_line)

        if next_line and re.search(r"\bqty\s*\d+\b", next_line.lower()):
            used_qty_lines.add(i + 1)

        weight, unit = extract_weight_unit(line)
        normalized_amount = normalize_weight(weight, unit)

        cleaned_name = clean_product_name(line)
        if len(cleaned_name) < 3:
            continue

        matched_name, score = match_known_name(cleaned_name, known_names, threshold=threshold)

        results.append({
            "line_no": i + 1,
            "raw_line": line,
            "cleaned_name": cleaned_name,
            "qty": qty,
            "weight": weight,
            "unit": unit,
            "normalized_amount": normalized_amount,
            "matched_name": matched_name,
            "match_score": score,
        })

    return pd.DataFrame(results)


def process_receipt(image_path, known_items_csv=None, threshold=OCR_THRESHOLD):
    import cv2

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    img_bgr = cv2.imread(image_path)
    if img_bgr is None:
        raise FileNotFoundError(f"Could not load image: {image_path}")

    gray, thresh = preprocess_receipt(img_bgr)
    raw_text = run_ocr(thresh)
    raw_lines = split_lines(raw_text)

    known_names = load_known_items(known_items_csv)
    matched_df = extract_receipt_items(raw_lines, known_names, threshold=threshold)

    return {
        "raw_text": raw_text,
        "raw_lines": raw_lines,
        "cleaned_names": matched_df["cleaned_name"].dropna().tolist(),
        "items": matched_df.to_dict(orient="records"),
    }