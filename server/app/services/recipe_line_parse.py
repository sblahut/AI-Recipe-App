import re
from typing import Literal

from app.units import canonical_unit_for_kind, default_unit

QuantityKindField = Literal["count", "weight", "volume"]

_WEIGHT_UNITS = frozenset({"g", "kg", "oz", "lb", "lbs"})
_VOLUME_UNITS = frozenset({"ml", "l", "cup", "cups", "tbsp", "tsp", "fl_oz", "gal", "qt", "pt"})


class ParsedRecipeLine:
    __slots__ = ("name", "quantity", "quantity_kind", "unit")

    def __init__(
        self,
        name: str,
        quantity: float | None,
        quantity_kind: QuantityKindField,
        unit: str | None,
    ) -> None:
        self.name = name
        self.quantity = quantity
        self.quantity_kind = quantity_kind
        self.unit = unit


def parse_recipe_ingredient_line(name: str, quantity_text: str | None) -> ParsedRecipeLine:
    trimmed_name = name.strip()
    qty = (quantity_text or "").strip()
    if not qty:
        return ParsedRecipeLine(trimmed_name, None, "count", None)

    match = re.match(r"^([\d./]+)\s*(\w+)?", qty)
    if not match:
        return ParsedRecipeLine(trimmed_name, None, "count", None)

    amount_str = match.group(1)
    try:
        if "/" in amount_str:
            num, den = amount_str.split("/", 1)
            amount = float(num) / float(den)
        else:
            amount = float(amount_str)
    except (ValueError, ZeroDivisionError):
        return ParsedRecipeLine(trimmed_name, None, "count", None)

    unit = match.group(2).lower() if match.group(2) else None

    if unit and unit in _WEIGHT_UNITS:
        return ParsedRecipeLine(
            trimmed_name, amount, "weight", canonical_unit_for_kind("weight", unit)
        )
    if unit and unit in _VOLUME_UNITS:
        return ParsedRecipeLine(
            trimmed_name, amount, "volume", canonical_unit_for_kind("volume", unit)
        )

    count_unit = canonical_unit_for_kind("count", unit) if unit else "each"
    return ParsedRecipeLine(trimmed_name, amount, "count", count_unit)


def effective_unit(kind: QuantityKindField, unit: str | None) -> str:
    if not unit:
        return default_unit(kind)
    return canonical_unit_for_kind(kind, unit) or default_unit(kind)
