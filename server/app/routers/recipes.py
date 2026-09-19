from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ingredient, SavedRecipe
from app.schemas import (
    RecipeGenerateRequest,
    RecipeGenerateResponse,
    SavedRecipeCreate,
    SavedRecipeRead,
)
from app.services import ollama

router = APIRouter(prefix="/recipes", tags=["recipes"])


def _format_line(row: Ingredient) -> str:
    parts = [row.name]
    if row.quantity is not None:
        unit = row.unit or ""
        kind = row.quantity_kind or "count"
        parts.append(f"({row.quantity} {unit}, {kind})".strip())
    if row.expires_at:
        parts.append(f"expires {row.expires_at.date().isoformat()}")
    return " ".join(parts)


@router.post("/generate", response_model=RecipeGenerateResponse)
async def generate_recipes(body: RecipeGenerateRequest, db: Session = Depends(get_db)) -> RecipeGenerateResponse:
    if body.use_all:
        rows = db.query(Ingredient).order_by(Ingredient.name).all()
    elif body.ingredient_ids:
        rows = db.query(Ingredient).filter(Ingredient.id.in_(body.ingredient_ids)).all()
        if len(rows) != len(set(body.ingredient_ids)):
            raise HTTPException(status_code=400, detail="One or more ingredient_ids not found")
    else:
        raise HTTPException(status_code=400, detail="Provide ingredient_ids or use_all=true")

    if not rows:
        raise HTTPException(status_code=400, detail="No ingredients available")

    if body.prioritize_expiring:
        rows = sorted(rows, key=lambda r: (r.expires_at is None, r.expires_at or ""))

    lines = [_format_line(r) for r in rows]

    try:
        recipes = await ollama.generate_recipes(
            lines,
            count=body.count,
            constraints=body.constraints,
            prioritize_expiring=body.prioritize_expiring,
        )
    except ollama.OllamaError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    return RecipeGenerateResponse(recipes=recipes)


@router.get("/saved", response_model=list[SavedRecipeRead])
def list_saved_recipes(db: Session = Depends(get_db)) -> list[SavedRecipeRead]:
    rows = db.query(SavedRecipe).order_by(SavedRecipe.created_at.desc()).all()
    return [SavedRecipeRead.from_orm_row(row) for row in rows]


@router.post("/saved", response_model=SavedRecipeRead, status_code=201)
def save_recipe(body: SavedRecipeCreate, db: Session = Depends(get_db)) -> SavedRecipeRead:
    row = SavedRecipe(
        title=body.recipe.title,
        payload_json=body.recipe.model_dump_json(),
        favorite=body.favorite,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return SavedRecipeRead.from_orm_row(row)


@router.get("/saved/{recipe_id}", response_model=SavedRecipeRead)
def get_saved_recipe(recipe_id: int, db: Session = Depends(get_db)) -> SavedRecipeRead:
    row = db.get(SavedRecipe, recipe_id)
    if not row:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return SavedRecipeRead.from_orm_row(row)


@router.delete("/saved/{recipe_id}", status_code=204)
def delete_saved_recipe(recipe_id: int, db: Session = Depends(get_db)) -> None:
    row = db.get(SavedRecipe, recipe_id)
    if not row:
        raise HTTPException(status_code=404, detail="Recipe not found")
    db.delete(row)
    db.commit()
