from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ingredient
from app.schemas import IngredientBulkCreate, IngredientCreate, IngredientRead, IngredientUpdate
from app.services.inventory_merge import upsert_ingredient, upsert_ingredients_bulk

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=list[IngredientRead])
def list_inventory(db: Session = Depends(get_db)) -> list[Ingredient]:
    return db.query(Ingredient).order_by(Ingredient.name).all()


@router.post("", response_model=IngredientRead, status_code=201)
def create_ingredient(body: IngredientCreate, db: Session = Depends(get_db)) -> Ingredient:
    return upsert_ingredient(db, body)


@router.post("/bulk", response_model=list[IngredientRead], status_code=201)
def bulk_create(body: IngredientBulkCreate, db: Session = Depends(get_db)) -> list[Ingredient]:
    return upsert_ingredients_bulk(db, body.items)


@router.patch("/{ingredient_id}", response_model=IngredientRead)
def update_ingredient(
    ingredient_id: int, body: IngredientUpdate, db: Session = Depends(get_db)
) -> Ingredient:
    row = db.get(Ingredient, ingredient_id)
    if not row:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{ingredient_id}", status_code=204)
def delete_ingredient(ingredient_id: int, db: Session = Depends(get_db)) -> None:
    row = db.get(Ingredient, ingredient_id)
    if not row:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    db.delete(row)
    db.commit()
