#!/usr/bin/env python3
"""
Import Open Food Facts JSONL export into the local products table.

Download (example, English dump):
  https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz

Usage:
  cd server
  python scripts/import_open_food_facts.py --input data/imports/openfoodfacts-products.jsonl.gz
  python scripts/import_open_food_facts.py --input data/imports/sample.jsonl --limit 1000
  python scripts/import_open_food_facts.py --input ... --country en:united-states
"""

from __future__ import annotations

import argparse
import gzip
import json
import sys
from pathlib import Path

SERVER_ROOT = Path(__file__).resolve().parent.parent
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.database import SessionLocal, init_db
from app.models import Product
from app.services.barcode import normalize_barcode

BATCH_SIZE = 2000


def _open_text(path: Path):
    if path.suffix == ".gz" or path.name.endswith(".jsonl.gz"):
        return gzip.open(path, "rt", encoding="utf-8")
    return path.open("r", encoding="utf-8")


def _product_name(record: dict) -> str | None:
    name = record.get("product_name") or record.get("product_name_en")
    if isinstance(name, str) and name.strip():
        return name.strip()
    generic = record.get("generic_name") or record.get("generic_name_en")
    if isinstance(generic, str) and generic.strip():
        return generic.strip()
    return None


def _matches_country(record: dict, country_tag: str | None) -> bool:
    if not country_tag:
        return True
    tags = record.get("countries_tags") or []
    return country_tag in tags


def import_file(
    path: Path,
    *,
    limit: int | None,
    country_tag: str | None,
    dry_run: bool,
) -> tuple[int, int, int]:
    init_db()
    session = SessionLocal()
    inserted = 0
    skipped = 0
    lines_read = 0
    batch: list[dict] = []

    try:
        with _open_text(path) as handle:
            for line_no, line in enumerate(handle, start=1):
                lines_read = line_no
                if limit is not None and line_no > limit:
                    break
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    skipped += 1
                    continue

                if not _matches_country(record, country_tag):
                    skipped += 1
                    continue

                code_raw = record.get("code") or record.get("_id")
                if not code_raw:
                    skipped += 1
                    continue

                name = _product_name(record)
                if not name:
                    skipped += 1
                    continue

                barcode = normalize_barcode(str(code_raw))
                brands = record.get("brands")
                brand = brands.strip() if isinstance(brands, str) and brands.strip() else None

                batch.append(
                    {
                        "barcode": barcode,
                        "name": name[:512],
                        "brand": brand[:256] if brand else None,
                        "default_quantity_kind": None,
                        "source": "open_food_facts",
                    }
                )

                if len(batch) >= BATCH_SIZE:
                    inserted += _flush_batch(session, batch, dry_run)
                    batch.clear()
                    if line_no % 50000 == 0:
                        print(
                            f"Processed {line_no} lines, inserted/updated ~{inserted} products..."
                        )

        if batch:
            inserted += _flush_batch(session, batch, dry_run)

        if not dry_run:
            session.commit()
        return inserted, skipped, lines_read
    finally:
        session.close()


def _flush_batch(session, batch: list[dict], dry_run: bool) -> int:
    if dry_run or not batch:
        return len(batch)
    stmt = sqlite_insert(Product).values(batch)
    stmt = stmt.on_conflict_do_update(
        index_elements=[Product.barcode],
        set_={
            "name": stmt.excluded.name,
            "brand": stmt.excluded.brand,
            "source": stmt.excluded.source,
        },
    )
    session.execute(stmt)
    session.commit()
    return len(batch)


def main() -> None:
    parser = argparse.ArgumentParser(description="Import Open Food Facts JSONL into products table")
    parser.add_argument(
        "--input",
        type=Path,
        required=True,
        help="Path to .jsonl or .jsonl.gz Open Food Facts export",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Stop after this many accepted+skipped records (for testing)",
    )
    parser.add_argument(
        "--country",
        type=str,
        default=None,
        help="Filter by countries_tags value, e.g. en:united-states",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse file but do not write to the database",
    )
    args = parser.parse_args()

    if not args.input.is_file():
        print(f"Input file not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    print(f"Importing from {args.input} (country={args.country or 'any'}, dry_run={args.dry_run})")
    inserted, skipped, _lines = import_file(
        args.input,
        limit=args.limit,
        country_tag=args.country,
        dry_run=args.dry_run,
    )
    print(f"Done. Upserted {inserted} products, skipped {skipped} lines.")


if __name__ == "__main__":
    main()
