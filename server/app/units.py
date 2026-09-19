from typing import Literal

QuantityKind = Literal["count", "weight", "volume"]

UNITS_BY_KIND: dict[QuantityKind, tuple[str, ...]] = {
    "count": ("each", "piece", "bunch", "clove", "can", "bag", "box", "pack", "dozen"),
    "weight": ("g", "kg", "oz", "lb"),
    "volume": ("ml", "l", "fl_oz", "cup", "tbsp", "tsp", "gal", "qt", "pt"),
}

DEFAULT_UNIT_BY_KIND: dict[QuantityKind, str] = {
    "count": "each",
    "weight": "g",
    "volume": "ml",
}


def normalize_unit(unit: str) -> str:
    return unit.strip().lower().replace(" ", "_")


def units_for_kind(kind: QuantityKind) -> tuple[str, ...]:
    return UNITS_BY_KIND[kind]


def validate_unit_for_kind(kind: QuantityKind, unit: str | None) -> str | None:
    if unit is None:
        return None
    normalized = normalize_unit(unit)
    allowed = {normalize_unit(u) for u in UNITS_BY_KIND[kind]}
    if normalized not in allowed:
        allowed_list = ", ".join(UNITS_BY_KIND[kind])
        raise ValueError(f"Unit '{unit}' is not valid for '{kind}'. Allowed: {allowed_list}")
    return normalized


def default_unit(kind: QuantityKind) -> str:
    return DEFAULT_UNIT_BY_KIND[kind]
