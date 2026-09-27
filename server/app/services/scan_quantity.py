"""Resolve inventory/shopping quantities for barcode scans."""

from __future__ import annotations

from app.models import Product
from app.units import QuantityKind, default_unit


def resolve_scan_quantity(
    *,
    use_product_defaults: bool,
    packages: float,
    quantity_kind: QuantityKind,
    unit: str | None,
    product: Product | None,
) -> tuple[QuantityKind, float, str]:
    if packages <= 0:
        raise ValueError("quantity must be greater than zero")

    if use_product_defaults and product is not None:
        kind: QuantityKind = product.default_quantity_kind or "count"
        if product.default_quantity is not None and product.default_unit:
            base = product.default_quantity
            resolved_unit = product.default_unit
            if kind == "count":
                quantity = packages if base == 1.0 else packages * base
            else:
                quantity = packages * base
            return kind, quantity, resolved_unit

        resolved_unit = default_unit(kind)
        return kind, packages, resolved_unit

    kind = quantity_kind
    if product and product.default_quantity_kind and unit is None:
        kind = product.default_quantity_kind
    resolved_unit = unit if unit is not None else default_unit(kind)
    return kind, packages, resolved_unit
