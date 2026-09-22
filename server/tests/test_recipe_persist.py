from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models import SavedRecipe
from app.schemas import GeneratedRecipe
from app.services.recipe_persist import (
    import_recipe_favorite_flag,
    import_recipe_should_persist,
    persist_generated_recipes_as_favorites,
)


def _recipe(title: str) -> GeneratedRecipe:
    return GeneratedRecipe(
        title=title,
        ingredients=[{"name": "salt", "quantity": "1"}],
        steps=["mix"],
    )


def test_persist_generated_recipes_as_favorites() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    db: Session = SessionLocal()

    saved = persist_generated_recipes_as_favorites(db, [_recipe("A"), _recipe("B")])

    assert len(saved) == 2
    assert all(row.favorite for row in saved)

    rows = db.query(SavedRecipe).order_by(SavedRecipe.id).all()
    assert len(rows) == 2
    assert rows[0].title == "A"
    assert rows[0].favorite is True
    assert rows[1].favorite is True

    db.close()


def test_import_recipe_should_persist() -> None:
    assert import_recipe_should_persist(persist=False, favorite=False) is False
    assert import_recipe_should_persist(persist=True, favorite=False) is True
    assert import_recipe_should_persist(persist=False, favorite=True) is True


def test_import_recipe_favorite_flag() -> None:
    assert import_recipe_favorite_flag(persist=False, favorite=False) is False
    assert import_recipe_favorite_flag(persist=True, favorite=False) is True
    assert import_recipe_favorite_flag(persist=False, favorite=True) is True
    assert import_recipe_favorite_flag(persist=True, favorite=True) is True
