from fastapi import APIRouter

from app.schemas import QuantityUnitsResponse
from app.units import UNITS_BY_KIND, QuantityKind

router = APIRouter(prefix="/meta", tags=["meta"])


@router.get("/quantity-units", response_model=QuantityUnitsResponse)
def quantity_units() -> QuantityUnitsResponse:
    kinds: dict[QuantityKind, list[str]] = {
        kind: list(units) for kind, units in UNITS_BY_KIND.items()
    }
    return QuantityUnitsResponse(kinds=kinds)
