"""Clean ABS CPI food index data into backend-ready CSV.

The CPI data is price-index data rather than product-level supermarket prices,
so this script outputs category-level food inflation signals. The combined
`build_food_reference.py` pipeline joins the latest category signal onto each
known ingredient.

Run:
    python data/pipelines/clean_pricing.py
"""

from __future__ import annotations

import argparse
from pathlib import Path

from build_food_reference import (
    CPI_COLUMNS,
    DEFAULT_CPI,
    DEFAULT_OUTPUT_DIR,
    load_cpi_indexes,
    write_csv,
)


def run(args):
    rows = load_cpi_indexes(args.cpi)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    write_csv(args.output_dir / "cpi_food_indexes.csv", rows, CPI_COLUMNS)
    print(f"cpi_food_indexes.csv: {len(rows)}")
    print(f"output_dir: {args.output_dir}")


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cpi", type=Path, default=DEFAULT_CPI)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    return parser.parse_args()


if __name__ == "__main__":
    run(parse_args())
