import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import SavedRecipe, ShoppingList, ShoppingListItem
from app.schemas import (
    GeneratedRecipe,
    ShoppingFromMealPlanRequest,
    ShoppingFromMealPlanResponse,
    ShoppingFromRecipeRequest,
    ShoppingFromRecipeResponse,
    ShoppingListCreate,
    ShoppingListDetail,
    ShoppingListItemCreate,
    ShoppingListItemRead,
    ShoppingListRead,
)
from app.services.shopping_from_meal_plan import add_meal_plan_range_to_shopping_list
from app.services.shopping_from_recipe import add_recipe_to_shopping_list

router = APIRouter(prefix="/shopping", tags=["shopping"])


@router.get("/lists", response_model=list[ShoppingListRead])
def list_shopping_lists(db: Session = Depends(get_db)) -> list[ShoppingList]:
    return db.query(ShoppingList).order_by(ShoppingList.created_at.desc()).all()


@router.post("/lists", response_model=ShoppingListRead, status_code=201)
def create_shopping_list(body: ShoppingListCreate, db: Session = Depends(get_db)) -> ShoppingList:
    row = ShoppingList(name=body.name)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/lists/{list_id}", response_model=ShoppingListDetail)
def get_shopping_list(list_id: int, db: Session = Depends(get_db)) -> ShoppingList:
    row = (
        db.query(ShoppingList)
        .options(joinedload(ShoppingList.items))
        .filter(ShoppingList.id == list_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    return row


@router.post("/from-recipe", response_model=ShoppingFromRecipeResponse)
def shopping_from_recipe(
    body: ShoppingFromRecipeRequest, db: Session = Depends(get_db)
) -> ShoppingFromRecipeResponse:
    if not db.get(ShoppingList, body.list_id):
        raise HTTPException(status_code=404, detail="Shopping list not found")

    recipe: GeneratedRecipe
    if body.saved_recipe_id is not None:
        row = db.get(SavedRecipe, body.saved_recipe_id)
        if not row:
            raise HTTPException(status_code=404, detail="Recipe not found")
        recipe = GeneratedRecipe.model_validate(json.loads(row.payload_json))
    elif body.recipe is not None:
        recipe = body.recipe
    else:
        raise HTTPException(status_code=400, detail="Provide recipe or saved_recipe_id")

    added, skipped = add_recipe_to_shopping_list(db, list_id=body.list_id, recipe=recipe)
    return ShoppingFromRecipeResponse(added=added, skipped_in_pantry=skipped)


@router.post("/from-meal-plan", response_model=ShoppingFromMealPlanResponse)
def shopping_from_meal_plan(
    body: ShoppingFromMealPlanRequest, db: Session = Depends(get_db)
) -> ShoppingFromMealPlanResponse:
    if not db.get(ShoppingList, body.list_id):
        raise HTTPException(status_code=404, detail="Shopping list not found")

    try:
        added, skipped, missing, meals_processed = add_meal_plan_range_to_shopping_list(
            db,
            list_id=body.list_id,
            start_date=body.start_date,
            end_date=body.end_date,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return ShoppingFromMealPlanResponse(
        added=added,
        skipped_in_pantry=skipped,
        missing_entry_ids=missing,
        meals_processed=meals_processed,
    )


@router.post("/lists/{list_id}/items", response_model=ShoppingListItemRead, status_code=201)
def add_shopping_item(
    list_id: int, body: ShoppingListItemCreate, db: Session = Depends(get_db)
) -> ShoppingListItem:
    if not db.get(ShoppingList, list_id):
        raise HTTPException(status_code=404, detail="Shopping list not found")
    item = ShoppingListItem(shopping_list_id=list_id, **body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/lists/{list_id}/items/{item_id}", response_model=ShoppingListItemRead)
def update_shopping_item(
    list_id: int,
    item_id: int,
    checked: bool | None = None,
    db: Session = Depends(get_db),
) -> ShoppingListItem:
    item = db.get(ShoppingListItem, item_id)
    if not item or item.shopping_list_id != list_id:
        raise HTTPException(status_code=404, detail="Item not found")
    if checked is not None:
        item.checked = checked
    db.commit()
    db.refresh(item)
    return item


@router.delete("/lists/{list_id}", status_code=204)
def delete_shopping_list(list_id: int, db: Session = Depends(get_db)) -> None:
    row = db.get(ShoppingList, list_id)
    if not row:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    db.delete(row)
    db.commit()


@router.delete("/lists/{list_id}/items/{item_id}", status_code=204)
def delete_shopping_item(list_id: int, item_id: int, db: Session = Depends(get_db)) -> None:
    item = db.get(ShoppingListItem, item_id)
    if not item or item.shopping_list_id != list_id:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
