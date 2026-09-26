import json
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Ingredient, RecipeChatMessage, RecipeChatSession, SavedRecipe
from app.schemas import (
    GeneratedRecipe,
    RecipeChatMessageRead,
    RecipeChatSessionDetail,
    RecipeChatSessionSummary,
    RecipeChatSendRequest,
    RecipeChatSendResponse,
    RecipeGenerateRequest,
    RecipeGenerateResponse,
    RecipeGenerateSourcesRequest,
    RecipeImportRequest,
    RecipeImportResponse,
    RecipePublixBogoGenerateRequest,
    RecipeSearchRequest,
    SavedRecipeCreate,
    SavedRecipeRead,
)
from app.services import ollama
from app.services.publix_bogo import PublixBogoError, fetch_publix_bogo_titles
from app.services.display_text import normalize_display_text, normalize_generated_recipe
from app.services.recipe_chat import (
    RecipeChatOptions,
    create_chat_session,
    list_chat_sessions,
    load_session_messages,
    send_recipe_chat_message,
)
from app.services.recipe_inventory_lines import format_ingredient_line
from app.services.recipe_persist import (
    import_recipe_favorite_flag,
    import_recipe_should_persist,
    persist_generated_recipes_as_favorites,
)
from app.services.recipe_url_fetch import RecipeFetchError, fetch_recipe_text_from_url

router = APIRouter(prefix="/recipes", tags=["recipes"])


def _format_line(row: Ingredient) -> str:
    return format_ingredient_line(row)


def _parse_message_recipes(recipes_json: str | None) -> list[GeneratedRecipe]:
    if not recipes_json:
        return []
    try:
        raw = json.loads(recipes_json)
    except json.JSONDecodeError:
        return []
    if not isinstance(raw, list):
        return []
    recipes: list[GeneratedRecipe] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        try:
            recipes.append(normalize_generated_recipe(GeneratedRecipe.model_validate(item)))
        except ValidationError:
            continue
    return recipes


def _normalize_recipes(recipes: list[GeneratedRecipe]) -> list[GeneratedRecipe]:
    return [normalize_generated_recipe(r) for r in recipes]


def _chat_message_to_read(row: RecipeChatMessage) -> RecipeChatMessageRead:
    return RecipeChatMessageRead(
        id=row.id,
        role=row.role,
        content=normalize_display_text(row.content),
        recipes=_parse_message_recipes(row.recipes_json),
        created_at=row.created_at,
    )


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

    recipes = _normalize_recipes(recipes)
    persist = (
        body.persist_generated
        if body.persist_generated is not None
        else settings.default_persist_generated_recipes
    )
    saved_reads = persist_generated_recipes_as_favorites(db, recipes) if persist else []

    return RecipeGenerateResponse(recipes=recipes, saved_recipes=saved_reads)


@router.post("/generate/publix-bogo", response_model=RecipeGenerateResponse)
async def generate_recipes_from_publix_bogo(
    body: RecipePublixBogoGenerateRequest, db: Session = Depends(get_db)
) -> RecipeGenerateResponse:
    store_number = body.publix_store_number or settings.publix_store_number
    if store_number is None:
        raise HTTPException(
            status_code=400,
            detail="Set PUBLIX_STORE_NUMBER on the server or send publix_store_number in the request",
        )

    try:
        bogo_titles = await fetch_publix_bogo_titles(store_number)
    except PublixBogoError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    lines = [f"{title} (Publix BOGO)" for title in bogo_titles]

    try:
        recipes = await ollama.generate_recipes_from_bogo_deals(
            lines, count=body.count, constraints=body.constraints
        )
    except ollama.OllamaError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    recipes = _normalize_recipes(recipes)
    persist = (
        body.persist_generated
        if body.persist_generated is not None
        else settings.default_persist_generated_recipes
    )
    saved_reads = persist_generated_recipes_as_favorites(db, recipes) if persist else []

    return RecipeGenerateResponse(recipes=recipes, saved_recipes=saved_reads)


@router.post("/generate/sources", response_model=RecipeGenerateResponse)
async def generate_recipes_from_sources(
    body: RecipeGenerateSourcesRequest, db: Session = Depends(get_db)
) -> RecipeGenerateResponse:
    idea = (body.query or "").strip()
    use_sources = body.use_pantry or body.use_publix_bogo

    if not use_sources:
        if len(idea) < 3:
            raise HTTPException(
                status_code=400,
                detail="Describe a recipe idea (3+ characters) or select pantry and/or Publix BOGOs.",
            )
        try:
            recipes = await ollama.search_recipes(
                query=idea, count=body.count, constraints=body.constraints
            )
        except ollama.OllamaError as e:
            raise HTTPException(status_code=502, detail=str(e)) from e
    else:
        pantry_lines: list[str] = []
        bogo_lines: list[str] = []

        if body.use_pantry:
            rows = db.query(Ingredient).order_by(Ingredient.name).all()
            if not rows:
                raise HTTPException(status_code=400, detail="No ingredients available")
            if body.prioritize_expiring:
                rows = sorted(rows, key=lambda r: (r.expires_at is None, r.expires_at or ""))
            pantry_lines = [_format_line(r) for r in rows]

        if body.use_publix_bogo:
            store_number = body.publix_store_number or settings.publix_store_number
            if store_number is None:
                raise HTTPException(
                    status_code=400,
                    detail="Set PUBLIX_STORE_NUMBER on the server or send publix_store_number",
                )
            try:
                bogo_titles = await fetch_publix_bogo_titles(store_number)
            except PublixBogoError as e:
                raise HTTPException(status_code=502, detail=str(e)) from e
            bogo_lines = [f"{title} (Publix BOGO)" for title in bogo_titles]

        try:
            recipes = await ollama.generate_recipes_from_selected_sources(
                pantry_lines=pantry_lines,
                bogo_lines=bogo_lines,
                count=body.count,
                constraints=body.constraints,
                prioritize_expiring=body.prioritize_expiring and bool(pantry_lines),
                idea_query=idea if idea else None,
            )
        except ollama.OllamaError as e:
            raise HTTPException(status_code=502, detail=str(e)) from e

    recipes = _normalize_recipes(recipes)
    persist = (
        body.persist_generated
        if body.persist_generated is not None
        else settings.default_persist_generated_recipes
    )
    saved_reads = persist_generated_recipes_as_favorites(db, recipes) if persist else []

    return RecipeGenerateResponse(recipes=recipes, saved_recipes=saved_reads)


@router.post("/search", response_model=RecipeGenerateResponse)
async def search_recipes(
    body: RecipeSearchRequest, db: Session = Depends(get_db)
) -> RecipeGenerateResponse:
    try:
        recipes = await ollama.search_recipes(
            query=body.query, count=body.count, constraints=body.constraints
        )
    except ollama.OllamaError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    recipes = _normalize_recipes(recipes)
    persist = (
        body.persist_generated
        if body.persist_generated is not None
        else settings.default_persist_generated_recipes
    )
    saved_reads = persist_generated_recipes_as_favorites(db, recipes) if persist else []

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
        recipe = normalize_generated_recipe(await ollama.import_recipe_from_text(source_text))
    except ollama.OllamaError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    persist = (
        body.persist if body.persist is not None else settings.default_persist_generated_recipes
    )
    saved: SavedRecipeRead | None = None
    if import_recipe_should_persist(persist=persist, favorite=body.favorite):
        row = SavedRecipe(
            title=recipe.title,
            payload_json=recipe.model_dump_json(),
            favorite=import_recipe_favorite_flag(persist=persist, favorite=body.favorite),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        saved = SavedRecipeRead.from_orm_row(row)

    return RecipeImportResponse(recipe=recipe, saved_recipe=saved)


@router.post("/chat/send", response_model=RecipeChatSendResponse)
async def send_recipe_chat(
    body: RecipeChatSendRequest, db: Session = Depends(get_db)
) -> RecipeChatSendResponse:
    session: RecipeChatSession | None = None
    if body.session_id is not None:
        session = db.get(RecipeChatSession, body.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
    else:
        session = create_chat_session(db)

    options = RecipeChatOptions(
        use_pantry=body.use_pantry,
        use_publix_bogo=body.use_publix_bogo,
        idea_query=body.query,
        count=body.count,
        constraints=body.constraints,
        prioritize_expiring=body.prioritize_expiring,
        publix_store_number=body.publix_store_number,
    )

    try:
        reply = await send_recipe_chat_message(
            db,
            session=session,
            user_message=body.message,
            options=options,
        )
    except ollama.OllamaError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    saved_reads: list[SavedRecipeRead] = []
    if reply.recipes:
        persist = (
            body.persist_generated
            if body.persist_generated is not None
            else settings.default_persist_generated_recipes
        )
        if persist:
            saved_reads = persist_generated_recipes_as_favorites(db, reply.recipes)

    messages = [
        _chat_message_to_read(row) for row in load_session_messages(db, session.id)
    ]
    reply_kind = "recipes" if reply.recipes else "message"
    return RecipeChatSendResponse(
        session_id=session.id,
        reply_kind=reply_kind,
        assistant_message=normalize_display_text(reply.assistant_text),
        recipes=_normalize_recipes(reply.recipes),
        saved_recipes=saved_reads,
        messages=messages,
    )


@router.get("/chat/sessions", response_model=list[RecipeChatSessionSummary])
def list_recipe_chat_sessions(db: Session = Depends(get_db)) -> list[RecipeChatSessionSummary]:
    return [
        RecipeChatSessionSummary(
            id=session.id,
            updated_at=session.updated_at,
            preview=preview,
            message_count=count,
        )
        for session, count, preview in list_chat_sessions(db)
    ]


@router.get("/chat/sessions/{session_id}", response_model=RecipeChatSessionDetail)
def get_recipe_chat_session(session_id: int, db: Session = Depends(get_db)) -> RecipeChatSessionDetail:
    row = db.get(RecipeChatSession, session_id)
    if not row:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return RecipeChatSessionDetail(
        id=row.id,
        updated_at=row.updated_at,
        messages=[_chat_message_to_read(m) for m in load_session_messages(db, session_id)],
    )


@router.delete("/chat/sessions/{session_id}", status_code=204)
def delete_recipe_chat_session(session_id: int, db: Session = Depends(get_db)) -> None:
    row = db.get(RecipeChatSession, session_id)
    if not row:
        raise HTTPException(status_code=404, detail="Chat session not found")
    db.delete(row)
    db.commit()


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
