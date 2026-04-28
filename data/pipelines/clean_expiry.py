"""Build FoodKeeper expiry reference outputs for app ingredients.

This is the expiry-only entry point. For the full nutrition + CPI + expiry
join, run `build_food_reference.py`.

Run:
    python data/pipelines/clean_expiry.py
"""

from __future__ import annotations

import argparse
from pathlib import Path

from build_food_reference import (
    DEFAULT_FOODKEEPER,
    DEFAULT_KNOWN,
    DEFAULT_OUTPUT_DIR,
    EXPIRY_COLUMNS,
    EXPIRY_MATCH_COLUMNS,
    build_expiry_aliases,
    load_foodkeeper_expiry,
    read_known_ingredients,
    score_expiry_match,
    write_csv,
)


def run(args):
    known = read_known_ingredients(args.known_ingredients)
    expiry_rows, foodkeeper_products = load_foodkeeper_expiry(args.foodkeeper)
    aliases = build_expiry_aliases(foodkeeper_products)
    matches = []
    for ingredient in known:
        match = score_expiry_match(ingredient, aliases)
        if match:
            matches.append(match)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    write_csv(args.output_dir / "expiry_reference.csv", expiry_rows, EXPIRY_COLUMNS)
    write_csv(args.output_dir / "ingredient_expiry_matches.csv", matches, EXPIRY_MATCH_COLUMNS)
    print(f"expiry_reference.csv: {len(expiry_rows)}")
    print(f"ingredient_expiry_matches.csv: {len(matches)}")
    print(f"output_dir: {args.output_dir}")


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--foodkeeper", type=Path, default=DEFAULT_FOODKEEPER)
    parser.add_argument("--known-ingredients", type=Path, default=DEFAULT_KNOWN)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    return parser.parse_args()


if __name__ == "__main__":
    run(parse_args())
