from sqlalchemy.orm import Session

from app.models import Ingredient, ShoppingListItem
from app.schemas import GeneratedRecipe, ShoppingListItemRead
from app.services.ingredient_names import ingredient_names_match
from app.services.recipe_line_parse import effective_unit, parse_recipe_ingredient_line


def _pantry_covers_line(
    line_name: str,
    inventory: list[Ingredient],
    uses_from_pantry: list[str],
) -> bool:
    if any(ingredient_names_match(row.name, line_name) for row in inventory):
        return True
    return any(ingredient_names_match(pantry_name, line_name) for pantry_name in uses_from_pantry)


def _find_list_item_by_name(items: list[ShoppingListItem], name: str) -> ShoppingListItem | None:
    for item in items:
        if ingredient_names_match(item.name, name):
            return item
    return None


def add_recipe_to_shopping_list(
    db: Session,
    *,
    list_id: int,
    recipe: GeneratedRecipe,
) -> tuple[list[ShoppingListItemRead], list[str]]:
    inventory = db.query(Ingredient).all()
    existing_items = (
        db.query(ShoppingListItem).filter(ShoppingListItem.shopping_list_id == list_id).all()
    )

    added: list[ShoppingListItemRead] = []
    skipped: list[str] = []

    for line in recipe.ingredients:
        parsed = parse_recipe_ingredient_line(line.name, line.quantity)
        if _pantry_covers_line(parsed.name, inventory, recipe.uses_from_pantry):
            skipped.append(parsed.name)
            continue

        existing = _find_list_item_by_name(existing_items, parsed.name)
        if existing:
            kind = parsed.quantity_kind
            mergeable = existing.quantity_kind == kind and effective_unit(
                kind, existing.unit
            ) == effective_unit(kind, parsed.unit)
            if mergeable:
                if parsed.quantity is not None:
                    if existing.quantity is None:
                        existing.quantity = parsed.quantity
                    else:
                        existing.quantity = existing.quantity + parsed.quantity
                db.commit()
                db.refresh(existing)
                added.append(ShoppingListItemRead.model_validate(existing))
                continue

        item = ShoppingListItem(
            shopping_list_id=list_id,
            name=parsed.name,
            quantity=parsed.quantity,
            quantity_kind=parsed.quantity_kind,
            unit=parsed.unit
            or (effective_unit(parsed.quantity_kind, None) if parsed.quantity else None),
            barcode=None,
            checked=False,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        existing_items.append(item)
        added.append(ShoppingListItemRead.model_validate(item))

    return added, skipped
