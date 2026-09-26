from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models import Ingredient
from app.schemas import GeneratedRecipe
from app.services.consume_recipe_from_pantry import consume_recipe_from_pantry


def _session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _recipe(*lines: tuple[str, str | None]) -> GeneratedRecipe:
    return GeneratedRecipe(
        title="Dinner",
        ingredients=[{"name": name, "quantity": qty} for name, qty in lines],
        steps=["cook"],
    )


def test_empty_recipe_does_not_touch_pantry() -> None:
    db = _session()
    db.add(Ingredient(name="salt", quantity=1, quantity_kind="count", unit="each"))
    db.commit()

    result = consume_recipe_from_pantry(db, _recipe())
    assert result.no_ingredient_lines is True
    assert db.query(Ingredient).count() == 1
    db.close()


def test_reduces_matching_quantity_and_deletes_when_used_up() -> None:
    db = _session()
    db.add(Ingredient(name="carrots", quantity=3, quantity_kind="count", unit="each"))
    db.add(Ingredient(name="onion", quantity=1, quantity_kind="count", unit="each"))
    db.commit()

    result = consume_recipe_from_pantry(
        db,
        _recipe(("carrots", "1 each"), ("onion", "1 each")),
    )

    assert result.reduced == ["carrots"]
    assert result.removed == ["onion"]
    leftover = db.query(Ingredient).filter(Ingredient.name == "carrots").one()
    assert leftover.quantity == 2
    assert db.query(Ingredient).filter(Ingredient.name == "onion").first() is None
    db.close()


def test_missing_and_unmeasured_lines_are_reported() -> None:
    db = _session()
    db.add(Ingredient(name="olive oil", quantity=250, quantity_kind="volume", unit="ml"))
    db.commit()

    result = consume_recipe_from_pantry(
        db,
        _recipe(("olive oil", None), ("chicken", "1 lb")),
    )

    assert result.skipped == ["olive oil"]
    assert result.missing == ["chicken"]
    oil = db.query(Ingredient).filter(Ingredient.name == "olive oil").one()
    assert oil.quantity == 250
    db.close()


def test_deletes_unquantified_pantry_item_when_recipe_has_amount() -> None:
    db = _session()
    db.add(Ingredient(name="eggs", quantity=None, quantity_kind="count", unit="each"))
    db.commit()

    result = consume_recipe_from_pantry(db, _recipe(("eggs", "2 each")))
    assert result.removed == ["eggs"]
    assert db.query(Ingredient).count() == 0
    db.close()
