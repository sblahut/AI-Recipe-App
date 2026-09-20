from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import MealPlanEntry, SavedRecipe
from app.schemas import MealPlanEntryCreate, MealPlanEntryRead, MealPlanEntryUpdate
from app.services.meal_plan_range import (
    meal_slot_sort_key,
    parse_plan_date,
    validate_plan_date_range,
)

router = APIRouter(prefix="/meal-plan", tags=["meal-plan"])


def _entry_to_read(row: MealPlanEntry) -> MealPlanEntryRead:
    title = row.saved_recipe.title if row.saved_recipe else "Unknown recipe"
    return MealPlanEntryRead(
        id=row.id,
        plan_date=row.plan_date,
        meal_slot=row.meal_slot,  # type: ignore[arg-type]
        saved_recipe_id=row.saved_recipe_id,
        recipe_title=title,
        created_at=row.created_at,
    )


@router.get("", response_model=list[MealPlanEntryRead])
def list_meal_plan(
    start: str = Query(..., description="Inclusive start date YYYY-MM-DD"),
    end: str = Query(..., description="Inclusive end date YYYY-MM-DD"),
    db: Session = Depends(get_db),
) -> list[MealPlanEntryRead]:
    try:
        start_d, end_d = validate_plan_date_range(start, end)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    rows = (
        db.query(MealPlanEntry)
        .options(joinedload(MealPlanEntry.saved_recipe))
        .order_by(MealPlanEntry.plan_date, MealPlanEntry.id)
        .all()
    )
    filtered = [
        row for row in rows if start_d <= parse_plan_date(row.plan_date) <= end_d
    ]
    filtered.sort(
        key=lambda row: (
            parse_plan_date(row.plan_date),
            meal_slot_sort_key(row.meal_slot),
            row.id,
        )
    )
    return [_entry_to_read(row) for row in filtered]


@router.post("", response_model=MealPlanEntryRead, status_code=201)
def create_meal_plan_entry(
    body: MealPlanEntryCreate, db: Session = Depends(get_db)
) -> MealPlanEntryRead:
    if not db.get(SavedRecipe, body.saved_recipe_id):
        raise HTTPException(status_code=404, detail="Recipe not found")

    row = MealPlanEntry(
        plan_date=body.plan_date,
        meal_slot=body.meal_slot,
        saved_recipe_id=body.saved_recipe_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row = (
        db.query(MealPlanEntry)
        .options(joinedload(MealPlanEntry.saved_recipe))
        .filter(MealPlanEntry.id == row.id)
        .one()
    )
    return _entry_to_read(row)


@router.patch("/{entry_id}", response_model=MealPlanEntryRead)
def update_meal_plan_entry(
    entry_id: int,
    body: MealPlanEntryUpdate,
    db: Session = Depends(get_db),
) -> MealPlanEntryRead:
    row = (
        db.query(MealPlanEntry)
        .options(joinedload(MealPlanEntry.saved_recipe))
        .filter(MealPlanEntry.id == entry_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Meal plan entry not found")

    if body.saved_recipe_id is not None and not db.get(SavedRecipe, body.saved_recipe_id):
        raise HTTPException(status_code=404, detail="Recipe not found")

    if body.plan_date is not None:
        row.plan_date = body.plan_date
    if body.meal_slot is not None:
        row.meal_slot = body.meal_slot
    if body.saved_recipe_id is not None:
        row.saved_recipe_id = body.saved_recipe_id

    db.commit()
    db.refresh(row)
    row = (
        db.query(MealPlanEntry)
        .options(joinedload(MealPlanEntry.saved_recipe))
        .filter(MealPlanEntry.id == row.id)
        .one()
    )
    return _entry_to_read(row)


@router.delete("/{entry_id}", status_code=204)
def delete_meal_plan_entry(entry_id: int, db: Session = Depends(get_db)) -> None:
    row = db.get(MealPlanEntry, entry_id)
    if not row:
        raise HTTPException(status_code=404, detail="Meal plan entry not found")
    db.delete(row)
    db.commit()
