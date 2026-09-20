import pytest

from app.units import default_unit, normalize_unit, validate_unit_for_kind


def test_normalize_unit_strips_and_underscores() -> None:
    assert normalize_unit("  Fl Oz ") == "fl_oz"


def test_validate_unit_accepts_aliases_after_normalize() -> None:
    assert validate_unit_for_kind("volume", "cup") == "cup"
    assert validate_unit_for_kind("weight", "LB") == "lb"


def test_validate_unit_none() -> None:
    assert validate_unit_for_kind("count", None) is None


def test_validate_unit_rejects_wrong_kind() -> None:
    with pytest.raises(ValueError, match="not valid for 'count'"):
        validate_unit_for_kind("count", "ml")


def test_default_unit_by_kind() -> None:
    assert default_unit("count") == "each"
    assert default_unit("weight") == "g"
    assert default_unit("volume") == "ml"
