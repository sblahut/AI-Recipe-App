from app.services.off_product_defaults import infer_product_defaults


def test_product_quantity_fields() -> None:
    defaults = infer_product_defaults(
        {
            "product_name": "Whole Milk",
            "product_quantity": "1",
            "product_quantity_unit": "l",
        }
    )
    assert defaults.default_quantity_kind == "volume"
    assert defaults.default_quantity == 1.0
    assert defaults.default_unit == "l"


def test_quantity_string_grams() -> None:
    defaults = infer_product_defaults(
        {
            "product_name": "Cheddar",
            "quantity": "8 oz",
        }
    )
    assert defaults.default_quantity_kind == "weight"
    assert defaults.default_quantity == 8.0
    assert defaults.default_unit == "oz"


def test_count_without_size() -> None:
    defaults = infer_product_defaults({"product_name": "Cheerios"})
    assert defaults.default_quantity_kind == "count"
    assert defaults.default_quantity == 1.0
    assert defaults.default_unit == "each"


def test_malformed_quantity_string_falls_back() -> None:
    defaults = infer_product_defaults(
        {
            "product_name": "Bad data",
            "quantity": ". g",
        }
    )
    assert defaults.default_quantity == 1.0
