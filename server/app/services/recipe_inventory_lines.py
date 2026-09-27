from datetime import date

from sqlalchemy.orm import Session

from app.config import settings
from app.models import Ingredient
from app.services.publix_bogo import PublixBogoError, fetch_publix_bogo_titles


def format_ingredient_line(row: Ingredient) -> str:
    parts = [row.name]
    if row.quantity is not None:
        unit = row.unit or ""
        kind = row.quantity_kind or "count"
        parts.append(f"({row.quantity} {unit}, {kind})".strip())
    if row.expires_at:
        exp_date = row.expires_at.date()
        verb = "expired" if exp_date <= date.today() else "expires"
        parts.append(f"{verb} {exp_date.isoformat()}")
    return " ".join(parts)


def gather_pantry_lines(
    db: Session,
    *,
    prioritize_expiring: bool,
) -> list[str]:
    rows = db.query(Ingredient).order_by(Ingredient.name).all()
    if prioritize_expiring:
        rows = sorted(rows, key=lambda r: (r.expires_at is None, r.expires_at or ""))
    return [format_ingredient_line(r) for r in rows]


async def gather_bogo_lines(
    *,
    publix_store_number: int | None,
) -> list[str]:
    store_number = publix_store_number or settings.publix_store_number
    if store_number is None:
        raise PublixBogoError(
            "Set PUBLIX_STORE_NUMBER on the server or send publix_store_number in the request"
        )
    titles = await fetch_publix_bogo_titles(store_number)
    return [f"{title} (Publix BOGO)" for title in titles]
