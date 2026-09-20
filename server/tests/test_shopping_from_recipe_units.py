from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models import ShoppingList
from app.schemas import GeneratedRecipe
from app.services.shopping_from_recipe import add_recipe_to_shopping_list


def test_shopping_list_accepts_cups_unit_from_recipe() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    db: Session = SessionLocal()

    shopping = ShoppingList(name="Publix")
    db.add(shopping)
    db.commit()
    db.refresh(shopping)

    recipe = GeneratedRecipe(
        title="Soup",
        ingredients=[{"name": "broth", "quantity": "2 cups"}],
        steps=["simmer"],
    )

    added, skipped = add_recipe_to_shopping_list(db, list_id=shopping.id, recipe=recipe)
    assert skipped == []
    assert len(added) == 1
    assert added[0].unit == "cup"

    db.close()
