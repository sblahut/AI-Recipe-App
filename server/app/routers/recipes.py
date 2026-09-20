from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Ingredient, SavedRecipe
from app.schemas import (
    RecipeGenerateRequest,
    RecipeGenerateResponse,
    RecipeImportRequest,
    RecipeImportResponse,
    SavedRecipeCreate,
    SavedRecipeRead,
)
from app.services import ollama
from app.services.recipe_url_fetch import RecipeFetchError, fetch_recipe_text_from_url

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
async def generate_recipes(
    body: RecipeGenerateRequest, db: Session = Depends(get_db)
) -> RecipeGenerateResponse:
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

    persist = (
        body.persist_generated
        if body.persist_generated is not None
        else settings.default_persist_generated_recipes
    )
    saved_reads: list[SavedRecipeRead] = []
    if persist:
        for recipe in recipes:
            row = SavedRecipe(
                title=recipe.title,
                payload_json=recipe.model_dump_json(),
                favorite=False,
            )
            db.add(row)
            db.flush()
            saved_reads.append(SavedRecipeRead.from_orm_row(row))
        db.commit()

    return RecipeGenerateResponse(recipes=recipes, saved_recipes=saved_reads)


@router.post("/import", response_model=RecipeImportResponse)
async def import_recipe(
    body: RecipeImportRequest, db: Session = Depends(get_db)
) -> RecipeImportResponse:
    source_text = (body.text or "").strip()
    if body.url:
        try:
            source_text = await fetch_recipe_text_from_url(body.url.strip())
        except RecipeFetchError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

    try:
        recipe = await ollama.import_recipe_from_text(source_text)
    except ollama.OllamaError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    persist = (
        body.persist if body.persist is not None else settings.default_persist_generated_recipes
    )
    saved: SavedRecipeRead | None = None
    if persist or body.favorite:
        row = SavedRecipe(
            title=recipe.title,
            payload_json=recipe.model_dump_json(),
            favorite=body.favorite,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        saved = SavedRecipeRead.from_orm_row(row)

    return RecipeImportResponse(recipe=recipe, saved_recipe=saved)


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
