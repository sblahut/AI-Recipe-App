"""Add shopping list lines for all recipes scheduled in a meal-plan date range."""

from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.models import MealPlanEntry, SavedRecipe
from app.schemas import GeneratedRecipe, ShoppingListItemRead
from app.services.meal_plan_range import (
    meal_slot_sort_key,
    parse_plan_date,
    validate_plan_date_range,
)
from app.services.shopping_from_recipe import add_recipe_to_shopping_list


def add_meal_plan_range_to_shopping_list(
    db: Session,
    *,
    list_id: int,
    start_date: str,
    end_date: str,
    skip_pantry_check: bool = False,
) -> tuple[list[ShoppingListItemRead], list[str], list[int], int]:
    start_d, end_d = validate_plan_date_range(start_date, end_date)

    rows = db.query(MealPlanEntry).all()
    in_range = [row for row in rows if start_d <= parse_plan_date(row.plan_date) <= end_d]
    in_range.sort(
        key=lambda row: (
            parse_plan_date(row.plan_date),
            meal_slot_sort_key(row.meal_slot),
            row.id,
        )
    )

    added: list[ShoppingListItemRead] = []
    skipped: list[str] = []
    missing_entry_ids: list[int] = []

    for entry in in_range:
        saved = db.get(SavedRecipe, entry.saved_recipe_id)
        if not saved:
            missing_entry_ids.append(entry.id)
            continue
        recipe = GeneratedRecipe.model_validate(json.loads(saved.payload_json))
        batch_added, batch_skipped = add_recipe_to_shopping_list(
            db,
            list_id=list_id,
            recipe=recipe,
            skip_pantry_check=skip_pantry_check,
        )
        added.extend(batch_added)
        skipped.extend(batch_skipped)

    deduped_skipped = list(dict.fromkeys(skipped))
    return added, deduped_skipped, missing_entry_ids, len(in_range)
