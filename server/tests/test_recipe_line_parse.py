from app.services.recipe_line_parse import parse_recipe_ingredient_line


def test_parse_weight_quantity() -> None:
    parsed = parse_recipe_ingredient_line("flour", "500 g")
    assert parsed.name == "flour"
    assert parsed.quantity == 500.0
    assert parsed.quantity_kind == "weight"
    assert parsed.unit == "g"


def test_parse_count_without_unit() -> None:
    parsed = parse_recipe_ingredient_line("eggs", "3")
    assert parsed.quantity_kind == "count"
    assert parsed.quantity == 3.0
