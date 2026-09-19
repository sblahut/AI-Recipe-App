"""Seed the local UPC catalog from bundled sample JSONL when empty."""

from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.config import SERVER_ROOT
from app.models import Product
from app.services.barcode import normalize_barcode

SAMPLE_PATH = SERVER_ROOT / "data" / "imports" / "sample.openfoodfacts.jsonl"


def _product_name(record: dict) -> str | None:
    name = record.get("product_name") or record.get("product_name_en")
    if isinstance(name, str) and name.strip():
        return name.strip()
    return None


def seed_sample_products_if_empty(db: Session) -> int:
    """Insert sample UPC rows when the products table has no rows. Returns rows upserted."""
    if db.query(Product).limit(1).first() is not None:
        return 0
    if not SAMPLE_PATH.is_file():
        return 0

    inserted = 0
    with SAMPLE_PATH.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            code_raw = record.get("code")
            if not code_raw:
                continue
            name = _product_name(record)
            if not name:
                continue
            barcode = normalize_barcode(str(code_raw))
            brand_raw = record.get("brands")
            brand = brand_raw.strip() if isinstance(brand_raw, str) and brand_raw.strip() else None
            row = db.get(Product, barcode)
            if row:
                row.name = name
                row.brand = brand
                row.source = "sample"
            else:
                db.add(
                    Product(
                        barcode=barcode,
                        name=name,
                        brand=brand,
                        source="sample",
                    )
                )
            inserted += 1

    if inserted:
        db.commit()
    return inserted
