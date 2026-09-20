from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models import Ingredient, MealPlanEntry, SavedRecipe, ShoppingList
from app.schemas import GeneratedRecipe
from app.services.shopping_from_meal_plan import add_meal_plan_range_to_shopping_list


def _recipe(title: str, ingredient: str) -> GeneratedRecipe:
    return GeneratedRecipe(
        title=title,
        ingredients=[{"name": ingredient, "quantity": "1"}],
        steps=["cook"],
    )


def test_add_meal_plan_range_merges_recipes_into_list() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    db: Session = SessionLocal()

    shopping = ShoppingList(name="Week")
    db.add(shopping)
    db.flush()

    saved = SavedRecipe(
        title="Soup",
        payload_json=_recipe("Soup", "carrots").model_dump_json(),
        favorite=True,
    )
    db.add(saved)
    db.flush()

    db.add(
        MealPlanEntry(
            plan_date="2026-04-07",
            meal_slot="dinner",
            saved_recipe_id=saved.id,
        )
    )
    db.add(
        MealPlanEntry(
            plan_date="2026-04-09",
            meal_slot="lunch",
            saved_recipe_id=saved.id,
        )
    )
    db.commit()

    added, skipped, missing, meals = add_meal_plan_range_to_shopping_list(
        db,
        list_id=shopping.id,
        start_date="2026-04-07",
        end_date="2026-04-13",
    )

    assert meals == 2
    assert missing == []
    assert skipped == []
    assert len(added) >= 1
    assert added[0].name == "carrots"

    db.add(Ingredient(name="carrots", quantity_kind="count"))
    db.commit()

    added2, skipped2, missing2, meals2 = add_meal_plan_range_to_shopping_list(
        db,
        list_id=shopping.id,
        start_date="2026-04-07",
        end_date="2026-04-13",
    )
    assert meals2 == 2
    assert missing2 == []
    assert "carrots" in skipped2
    assert added2 == []

    db.close()
