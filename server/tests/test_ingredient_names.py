from app.services.ingredient_names import ingredient_names_match, normalize_ingredient_name


def test_normalize_collapses_whitespace_and_case() -> None:
    assert normalize_ingredient_name("  Olive   Oil ") == "olive oil"


def test_names_match_exact_and_substring() -> None:
    assert ingredient_names_match("Garlic", "garlic")
    assert ingredient_names_match("extra virgin olive oil", "olive oil")
