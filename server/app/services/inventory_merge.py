from sqlalchemy.orm import Session

from app.models import Ingredient
from app.schemas import IngredientCreate
from app.services.ingredient_names import ingredient_names_match
from app.units import QuantityKind, default_unit, normalize_unit


def _units_compatible(
    kind: QuantityKind, existing_unit: str | None, incoming_unit: str | None
) -> bool:
    eu = normalize_unit(existing_unit) if existing_unit else default_unit(kind)
    iu = normalize_unit(incoming_unit) if incoming_unit else default_unit(kind)
    return eu == iu


def find_merge_candidate(db: Session, payload: IngredientCreate) -> Ingredient | None:
    barcode = payload.barcode.strip() if payload.barcode else None
    if barcode:
        row = db.query(Ingredient).filter(Ingredient.barcode == barcode).first()
        if row:
            return row

    for row in db.query(Ingredient).order_by(Ingredient.id):
        if barcode and row.barcode and row.barcode != barcode:
            continue
        if ingredient_names_match(row.name, payload.name):
            return row
    return None


def merge_ingredient(existing: Ingredient, payload: IngredientCreate) -> None:
    kind = payload.quantity_kind
    if _units_compatible(kind, existing.unit, payload.unit):
        if payload.quantity is not None:
            if existing.quantity is None:
                existing.quantity = payload.quantity
            else:
                existing.quantity = existing.quantity + payload.quantity
        existing.quantity_kind = kind
        if payload.unit is not None:
            existing.unit = payload.unit
        elif existing.unit is None and payload.quantity is not None:
            existing.unit = default_unit(kind)
    elif payload.quantity is not None and existing.quantity is None:
        existing.quantity = payload.quantity
        existing.quantity_kind = kind
        existing.unit = payload.unit or default_unit(kind)

    if payload.location and not existing.location:
        existing.location = payload.location
    if payload.barcode and not existing.barcode:
        existing.barcode = payload.barcode
    if payload.notes and not existing.notes:
        existing.notes = payload.notes
    if payload.expires_at and (
        existing.expires_at is None or payload.expires_at < existing.expires_at
    ):
        existing.expires_at = payload.expires_at


def upsert_ingredient(db: Session, payload: IngredientCreate) -> Ingredient:
    existing = find_merge_candidate(db, payload)
    if existing:
        merge_ingredient(existing, payload)
        db.commit()
        db.refresh(existing)
        return existing

    row = Ingredient(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def upsert_ingredients_bulk(db: Session, items: list[IngredientCreate]) -> list[Ingredient]:
    rows: list[Ingredient] = []
    for item in items:
        rows.append(upsert_ingredient(db, item))
    return rows
