"""Deduct a cooked recipe's ingredient lines from pantry inventory."""

from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.models import Ingredient
from app.schemas import GeneratedRecipe
from app.services.ingredient_names import ingredient_names_match
from app.services.recipe_line_parse import effective_unit, parse_recipe_ingredient_line
from app.units import QuantityKind


@dataclass
class ConsumePantryResult:
    removed: list[str] = field(default_factory=list)
    reduced: list[str] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    no_ingredient_lines: bool = False


def _units_compatible(
    kind: QuantityKind, existing_unit: str | None, incoming_unit: str | None
) -> bool:
    return effective_unit(kind, existing_unit) == effective_unit(kind, incoming_unit)


def _find_match(
    inventory: list[Ingredient],
    line_name: str,
    used_ids: set[int],
) -> Ingredient | None:
    exact: Ingredient | None = None
    fuzzy: Ingredient | None = None
    for row in inventory:
        if row.id in used_ids:
            continue
        if not ingredient_names_match(row.name, line_name):
            continue
        if row.name.strip().lower() == line_name.strip().lower():
            exact = row
            break
        if fuzzy is None:
            fuzzy = row
    return exact or fuzzy


def consume_recipe_from_pantry(db: Session, recipe: GeneratedRecipe) -> ConsumePantryResult:
    if not recipe.ingredients:
        return ConsumePantryResult(no_ingredient_lines=True)

    inventory = db.query(Ingredient).order_by(Ingredient.id).all()
    used_ids: set[int] = set()
    result = ConsumePantryResult()

    for line in recipe.ingredients:
        parsed = parse_recipe_ingredient_line(line.name, line.quantity)
        match = _find_match(inventory, parsed.name, used_ids)
        if match is None:
            result.missing.append(parsed.name)
            continue

        used_ids.add(match.id)
        same_kind = match.quantity_kind == parsed.quantity_kind
        can_reduce = (
            same_kind
            and parsed.quantity is not None
            and match.quantity is not None
            and _units_compatible(parsed.quantity_kind, match.unit, parsed.unit)
        )

        if can_reduce:
            remaining = (match.quantity or 0) - (parsed.quantity or 0)
            if remaining > 1e-9:
                match.quantity = remaining
                result.reduced.append(match.name)
            else:
                db.delete(match)
                result.removed.append(match.name)
            continue

        if parsed.quantity is None:
            result.skipped.append(parsed.name)
            used_ids.discard(match.id)
            continue

        if same_kind and match.quantity is None:
            db.delete(match)
            result.removed.append(match.name)
            continue

        result.skipped.append(parsed.name)
        used_ids.discard(match.id)

    return result
