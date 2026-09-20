from app.models import Ingredient
from app.services.shopping_from_recipe import _pantry_covers_line


def test_pantry_covers_from_inventory() -> None:
    inventory = [Ingredient(name="Garlic")]
    assert _pantry_covers_line("garlic cloves", inventory, []) is True


def test_pantry_covers_from_uses_from_pantry() -> None:
    assert _pantry_covers_line("olive oil", [], ["Extra Virgin Olive Oil"]) is True


def test_pantry_does_not_cover_missing() -> None:
    assert _pantry_covers_line("saffron", [], []) is False
