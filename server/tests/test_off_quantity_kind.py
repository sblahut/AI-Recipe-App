from app.services.off_quantity_kind import infer_default_quantity_kind


def test_milk_name_defaults_to_volume() -> None:
    assert infer_default_quantity_kind({"product_name": "Whole Vitamin D Milk"}) == "volume"


def test_off_unit_ml() -> None:
    assert (
        infer_default_quantity_kind(
            {"product_name": "Sparkling Water", "product_quantity_unit": "ml"}
        )
        == "volume"
    )


def test_generic_box_defaults_to_count() -> None:
    assert (
        infer_default_quantity_kind(
            {"product_name": "Cheerios", "categories_tags": ["en:breakfast-cereals"]}
        )
        == "count"
    )


def test_cheese_name_weight() -> None:
    assert infer_default_quantity_kind({"product_name": "Sharp Cheddar Cheese"}) == "weight"
