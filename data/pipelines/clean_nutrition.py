"""Clean AFCD Release 3 nutrition data into backend-ready CSV.

Run:
    python data/pipelines/clean_nutrition.py
"""

from __future__ import annotations

import argparse
from pathlib import Path

from build_food_reference import (
    DEFAULT_AFCD,
    DEFAULT_OUTPUT_DIR,
    NUTRITION_COLUMNS,
    load_afcd_nutrition,
    write_csv,
)


def run(args):
    rows = load_afcd_nutrition(args.afcd)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    write_csv(args.output_dir / "afcd_nutrition_clean.csv", rows, NUTRITION_COLUMNS)
    print(f"afcd_nutrition_clean.csv: {len(rows)}")
    print(f"output_dir: {args.output_dir}")


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--afcd", type=Path, default=DEFAULT_AFCD)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    return parser.parse_args()


if __name__ == "__main__":
    run(parse_args())
