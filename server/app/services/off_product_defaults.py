"""Infer default pantry quantity (kind, amount, unit) from Open Food Facts product records."""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.services.off_quantity_kind import infer_default_quantity_kind
from app.units import QuantityKind, canonical_unit_for_kind, default_unit

_SIZE_IN_QUANTITY = re.compile(
    r"([\d.]+)\s*(ml|l|cl|dl|fl\s*oz|oz|lb|lbs|g|kg)\b",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class OffProductDefaults:
    default_quantity_kind: QuantityKind
    default_quantity: float | None
    default_unit: str | None


def _float_token(raw: object) -> float | None:
    if raw is None:
        return None
    text = str(raw).strip().replace(",", ".")
    if not text:
        return None
    try:
        value = float(text)
    except ValueError:
        return None
    return value if value > 0 else None


def _parse_quantity_string(raw: str) -> tuple[float, str] | None:
    match = _SIZE_IN_QUANTITY.search(raw.strip().lower().replace(",", "."))
    if not match:
        return None
    qty = _float_token(match.group(1))
    if qty is None:
        return None
    unit = match.group(2).replace(" ", "")
    if unit == "floz":
        unit = "fl oz"
    return qty, unit


def _parse_off_package_size(record: dict, kind: QuantityKind) -> tuple[float, str] | None:
    qty_raw = record.get("product_quantity")
    unit_raw = record.get("product_quantity_unit")
    if unit_raw is not None and isinstance(unit_raw, str) and unit_raw.strip():
        qty = _float_token(qty_raw)
        if qty is not None:
            return qty, unit_raw.strip()

    for key in ("quantity", "product_quantity"):
        raw = record.get(key)
        if isinstance(raw, str) and raw.strip():
            parsed = _parse_quantity_string(raw)
            if parsed:
                return parsed
    return None


def infer_product_defaults(record: dict) -> OffProductDefaults:
    kind = infer_default_quantity_kind(record)
    parsed = _parse_off_package_size(record, kind)
    if parsed:
        qty, unit_token = parsed
        unit = canonical_unit_for_kind(kind, unit_token)
        if unit is not None:
            return OffProductDefaults(kind, qty, unit)

    if kind == "count":
        return OffProductDefaults(kind, 1.0, "each")
    return OffProductDefaults(kind, 1.0, default_unit(kind))
