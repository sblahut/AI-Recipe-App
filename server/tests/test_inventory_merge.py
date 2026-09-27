from datetime import UTC, datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models import Ingredient
from app.schemas import IngredientCreate
from app.services.inventory_merge import find_merge_candidate, merge_ingredient, upsert_ingredient


def _session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def test_find_merge_candidate_prefers_barcode() -> None:
    db = _session()
    db.add(Ingredient(name="Milk", barcode="111", quantity=1, quantity_kind="count", unit="each"))
    db.add(Ingredient(name="Milk", barcode="222", quantity=1, quantity_kind="count", unit="each"))
    db.commit()

    payload = IngredientCreate(name="Whole milk", barcode="222", quantity=1, quantity_kind="count")
    match = find_merge_candidate(db, payload)
    assert match is not None
    assert match.barcode == "222"
    db.close()


def test_merge_ingredient_adds_compatible_quantities() -> None:
    db = _session()
    row = Ingredient(name="rice", quantity=1, quantity_kind="count", unit="each")
    db.add(row)
    db.commit()

    merge_ingredient(
        row,
        IngredientCreate(name="rice", quantity=2, quantity_kind="count", unit="each"),
    )
    assert row.quantity == 3
    db.close()


def test_upsert_ingredient_creates_then_merges_by_name() -> None:
    db = _session()
    first = upsert_ingredient(
        db,
        IngredientCreate(name="Tomatoes", quantity=2, quantity_kind="count", unit="each"),
    )
    second = upsert_ingredient(
        db,
        IngredientCreate(name="tomatoes", quantity=3, quantity_kind="count", unit="each"),
    )

    assert first.id == second.id
    assert second.quantity == 5
    assert db.query(Ingredient).count() == 1
    db.close()


def test_merge_fills_empty_metadata_and_earlier_expiry() -> None:
    db = _session()
    row = Ingredient(name="yogurt", quantity=1, quantity_kind="count", unit="each")
    db.add(row)
    db.commit()

    sooner = datetime(2026, 4, 1, tzinfo=UTC)
    later = datetime(2026, 5, 1, tzinfo=UTC)
    merge_ingredient(
        row,
        IngredientCreate(
            name="yogurt",
            quantity=1,
            quantity_kind="count",
            unit="each",
            location="fridge",
            barcode="999",
            notes="plain",
            expires_at=sooner,
        ),
    )
    assert row.location == "fridge"
    assert row.barcode == "999"
    assert row.notes == "plain"
    assert row.expires_at == sooner

    merge_ingredient(
        row,
        IngredientCreate(
            name="yogurt",
            quantity=None,
            quantity_kind="count",
            unit="each",
            expires_at=later,
        ),
    )
    assert row.expires_at == sooner
    db.close()
