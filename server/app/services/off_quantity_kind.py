"""Infer inventory quantity_kind from Open Food Facts fields or product text."""

from __future__ import annotations

import re

from app.units import QuantityKind

_VOLUME_UNITS = frozenset(
    {"l", "ml", "cl", "dl", "fl oz", "floz", "fl_oz", "gal", "qt", "pt", "cup", "cups"}
)
_WEIGHT_UNITS = frozenset({"kg", "g", "mg", "oz", "lb", "lbs"})

_VOLUME_CATEGORY_HINTS = (
    "beverage",
    "beverages",
    "milk",
    "milks",
    "juice",
    "juices",
    "water",
    "soda",
    "soft-drink",
    "oil",
    "oils",
    "vinegar",
    "broth",
    "stock",
    "cream",
    "yogurt-drink",
    "plant-based-beverages",
)

_WEIGHT_CATEGORY_HINTS = (
    "meat",
    "meats",
    "cheese",
    "cheeses",
    "fish",
    "seafood",
    "butter",
    "flour",
    "sugar",
)

_VOLUME_NAME_HINTS = (
    " milk",
    "milk ",
    " juice",
    " soda",
    " cola",
    " water",
    " oil",
    " vinegar",
    " broth",
    " stock",
    " cream",
    " beverage",
    " litre",
    " liter",
    " ml",
    " fl oz",
)

_WEIGHT_NAME_HINTS = (
    " cheese",
    " butter",
    " chicken",
    " beef",
    " pork",
    " fish",
    " flour",
    " sugar",
    " lb ",
    " oz ",
)


def _kind_from_unit_token(unit: str) -> QuantityKind | None:
    normalized = unit.strip().lower().replace("_", " ")
    if normalized in _VOLUME_UNITS or (normalized.endswith("l") and normalized[:-1].isdigit()):
        return "volume"
    if normalized in _WEIGHT_UNITS:
        return "weight"
    if normalized in ("l",):
        return "volume"
    return None


def _kind_from_off_quantity_fields(record: dict) -> QuantityKind | None:
    unit_raw = record.get("product_quantity_unit")
    if isinstance(unit_raw, str) and unit_raw.strip():
        kind = _kind_from_unit_token(unit_raw)
        if kind:
            return kind

    for key in ("quantity", "product_quantity"):
        raw = record.get(key)
        if not isinstance(raw, str) or not raw.strip():
            continue
        match = re.search(
            r"([\d.]+\s*(?:ml|l|cl|dl|fl\s*oz|oz|lb|lbs|g|kg))\b",
            raw.lower(),
        )
        if not match:
            continue
        token = match.group(1)
        if re.search(r"\b(ml|l|cl|dl|fl\s*oz)\b", token):
            return "volume"
        if re.search(r"\b(oz|lb|lbs|g|kg)\b", token):
            return "weight"
    return None


def _category_blob(record: dict) -> str:
    parts: list[str] = []
    for key in ("categories_tags", "categories"):
        value = record.get(key)
        if isinstance(value, list):
            parts.extend(str(item).lower() for item in value)
        elif isinstance(value, str):
            parts.append(value.lower())
    return " ".join(parts)


def _name_blob(record: dict) -> str:
    for key in ("product_name", "product_name_en", "generic_name", "generic_name_en"):
        value = record.get(key)
        if isinstance(value, str) and value.strip():
            return f" {value.strip().lower()} "
    return ""


def _kind_from_text_hints(category_blob: str, name_blob: str) -> QuantityKind | None:
    for hint in _VOLUME_CATEGORY_HINTS:
        if hint in category_blob:
            return "volume"
    for hint in _WEIGHT_CATEGORY_HINTS:
        if hint in category_blob:
            return "weight"
    for hint in _VOLUME_NAME_HINTS:
        if hint in name_blob:
            return "volume"
    for hint in _WEIGHT_NAME_HINTS:
        if hint in name_blob:
            return "weight"
    return None


def infer_default_quantity_kind(record: dict) -> QuantityKind:
    """
    Best-effort quantity_kind for a barcode product.
    Packaged goods default to count when no signal is found.
    """
    from_fields = _kind_from_off_quantity_fields(record)
    if from_fields:
        return from_fields

    category_blob = _category_blob(record)
    name_blob = _name_blob(record)
    from_text = _kind_from_text_hints(category_blob, name_blob)
    if from_text:
        return from_text

    return "count"
