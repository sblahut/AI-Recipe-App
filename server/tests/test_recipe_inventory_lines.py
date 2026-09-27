from datetime import UTC, date, datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models import Ingredient
from app.services.recipe_inventory_lines import format_ingredient_line, gather_pantry_lines


def _session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def test_format_ingredient_line_includes_quantity_and_expiry() -> None:
    tomorrow = date.today() + timedelta(days=2)
    row = Ingredient(
        name="spinach",
        quantity=1,
        quantity_kind="count",
        unit="bag",
        expires_at=datetime.combine(tomorrow, datetime.min.time(), tzinfo=UTC),
    )
    line = format_ingredient_line(row)
    assert "spinach" in line
    assert "1 bag" in line
    assert f"expires {tomorrow.isoformat()}" in line


def test_format_ingredient_line_marks_past_dates_as_expired() -> None:
    yesterday = date.today() - timedelta(days=1)
    row = Ingredient(
        name="milk",
        quantity=2,
        quantity_kind="volume",
        unit="cup",
        expires_at=datetime.combine(yesterday, datetime.min.time(), tzinfo=UTC),
    )
    line = format_ingredient_line(row)
    assert f"expired {yesterday.isoformat()}" in line


def test_gather_pantry_lines_can_prioritize_expiring() -> None:
    db = _session()
    soon = datetime(2026, 4, 1, tzinfo=UTC)
    later = datetime(2026, 5, 1, tzinfo=UTC)
    db.add_all(
        [
            Ingredient(name="later", expires_at=later, quantity_kind="count"),
            Ingredient(name="soon", expires_at=soon, quantity_kind="count"),
            Ingredient(name="no date", expires_at=None, quantity_kind="count"),
        ]
    )
    db.commit()

    lines = gather_pantry_lines(db, prioritize_expiring=True)
    assert lines[0].startswith("soon")
    assert lines[1].startswith("later")
    assert lines[-1].startswith("no date")
    db.close()
