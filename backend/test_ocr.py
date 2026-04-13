import os
import re
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