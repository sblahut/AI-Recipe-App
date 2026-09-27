"""Look up UPC/EAN on Open Food Facts when the local products table has no match."""

from __future__ import annotations

import httpx

from app.services.off_product_defaults import OffProductDefaults, infer_product_defaults

OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
TIMEOUT = httpx.Timeout(6.0, connect=3.0)


class OffProductInfo:
    __slots__ = (
        "brand",
        "default_quantity",
        "default_quantity_kind",
        "default_unit",
        "name",
    )

    def __init__(
        self,
        name: str,
        brand: str | None,
        defaults: OffProductDefaults,
    ) -> None:
        self.name = name
        self.brand = brand
        self.default_quantity_kind = defaults.default_quantity_kind
        self.default_quantity = defaults.default_quantity
        self.default_unit = defaults.default_unit


def lookup_product(barcode: str) -> OffProductInfo | None:
    """
    Return product fields if OFF knows this barcode, else None.
    Requires outbound HTTPS from the home PC running the API.
    """
    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            response = client.get(OFF_PRODUCT_URL.format(barcode=barcode))
    except httpx.HTTPError:
        return None

    if response.status_code != 200:
        return None

    try:
        payload = response.json()
    except ValueError:
        return None

    if payload.get("status") != 1:
        return None

    product = payload.get("product")
    if not isinstance(product, dict):
        return None

    name = product.get("product_name") or product.get("product_name_en")
    if not isinstance(name, str) or not name.strip():
        generic = product.get("generic_name") or product.get("generic_name_en")
        if isinstance(generic, str) and generic.strip():
            name = generic
        else:
            return None

    brand_raw = product.get("brands")
    brand = brand_raw.strip() if isinstance(brand_raw, str) and brand_raw.strip() else None
    defaults = infer_product_defaults(product)
    return OffProductInfo(name=name.strip(), brand=brand, defaults=defaults)


def lookup_product_name(barcode: str) -> tuple[str, str | None] | None:
    """Backward-compatible name + brand lookup."""
    info = lookup_product(barcode)
    if not info:
        return None
    return info.name, info.brand
