import pytest
from pydantic import ValidationError

from app.schemas import MealPlanEntryCreate, ShoppingFromMealPlanRequest


def test_meal_plan_entry_create_validates_date() -> None:
    row = MealPlanEntryCreate(
        plan_date="2026-04-07",
        meal_slot="dinner",
        saved_recipe_id=1,
    )
    assert row.meal_slot == "dinner"


def test_meal_plan_entry_create_rejects_bad_date() -> None:
    with pytest.raises(ValidationError):
        MealPlanEntryCreate(plan_date="bad", meal_slot="lunch", saved_recipe_id=1)


def test_shopping_from_meal_plan_request_validates_range() -> None:
    with pytest.raises(ValidationError):
        ShoppingFromMealPlanRequest(
            list_id=1,
            start_date="2026-04-10",
            end_date="2026-04-01",
        )
