from app.services.recipe_line_parse import effective_unit, parse_recipe_ingredient_line


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


def test_parse_volume_cups() -> None:
    parsed = parse_recipe_ingredient_line("milk", "2 cups")
    assert parsed.quantity == 2.0
    assert parsed.quantity_kind == "volume"
    assert parsed.unit == "cups"


def test_parse_fraction_volume() -> None:
    parsed = parse_recipe_ingredient_line("sugar", "1/2 cup")
    assert parsed.quantity == 0.5
    assert parsed.quantity_kind == "volume"
    assert parsed.unit == "cup"


def test_parse_empty_quantity() -> None:
    parsed = parse_recipe_ingredient_line("salt", None)
    assert parsed.quantity is None
    assert parsed.quantity_kind == "count"


def test_parse_unrecognized_quantity_text() -> None:
    parsed = parse_recipe_ingredient_line("pepper", "to taste")
    assert parsed.quantity is None


def test_effective_unit_falls_back_to_kind_default() -> None:
    assert effective_unit("weight", None) == "g"
    assert effective_unit("volume", "tbsp") == "tbsp"
