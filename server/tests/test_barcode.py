from app.services.barcode import normalize_barcode


def test_normalize_strips_non_digits() -> None:
    assert normalize_barcode("0 12345 67890 5") == "012345678905"


def test_normalize_keeps_plain_digits() -> None:
    assert normalize_barcode("4011") == "4011"


def test_normalize_empty_after_strip_falls_back_to_cleaned() -> None:
    assert normalize_barcode("  ---  ") == "---"
