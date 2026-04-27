from modules.receipt.ocr import (
    extract_price,
    extract_qty,
    format_product_name,
    parse_receipt_lines,
)


def test_parse_receipt_lines_stops_at_total_section():
    known_items = [
        "milk",
        "baby spinach",
        "bread",
        "coffee",
    ]
    lines = [
        "Milk 2L $4.50",
        "Baby Spinach 120g $3.50",
        "TOTAL $8.00",
        "Coffee rewards offer $2.00",
        "Bread coupon $3.00",
    ]

    results = parse_receipt_lines(lines, known_items)

    assert [item["name"] for item in results] == ["Milk", "Baby Spinach"]


def test_parse_receipt_lines_stops_at_subtotal_section():
    known_items = [
        "bread",
        "chicken breast",
        "banana",
    ]
    lines = [
        "Bread 1 each $3.20",
        "Chicken breast 1.2kg $14.40",
        "SUB TOTAL $17.60",
        "Banana card payment $2.00",
    ]

    results = parse_receipt_lines(lines, known_items)

    assert [item["name"] for item in results] == ["Bread", "Chicken Breast"]


def test_parse_receipt_lines_displays_product_name_but_keeps_known_match():
    known_items = ["baby spinach", "milk"]
    lines = [
        "WW Baby Spinach 120g $3.50",
        "Woolworths Lite Milk 2L $4.50",
    ]

    results = parse_receipt_lines(lines, known_items)

    assert results[0]["name"] == "WW Baby Spinach"
    assert results[0]["matched_name"] == "baby spinach"
    assert results[0]["match_score"] >= 0.5

    assert results[1]["name"] == "Woolworths Lite Milk"
    assert results[1]["matched_name"] == "milk"


def test_format_product_name_makes_scanned_names_user_friendly():
    assert format_product_name("ww baby spinach") == "WW Baby Spinach"
    assert format_product_name("uht lite milk") == "UHT Lite Milk"


def test_extract_qty_handles_common_receipt_quantity_formats():
    assert extract_qty("milk 2l $4.50") == "2 l"
    assert extract_qty("baby spinach 120g $3.50") == "120 g"
    assert extract_qty("bread qty 2 $6.40") == "2 each"
    assert extract_qty("tuna 4 pack $8.00") == "4 pack"
    assert extract_qty("yoghurt 2 x $3.00 $6.00") == "2 each"


def test_extract_price_uses_last_money_amount_as_line_total():
    assert extract_price("yoghurt 2 x $3.00 $6.00") == 6.0
