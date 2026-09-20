from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product
from app.schemas import HomeNetworkResponse, ProductCatalogStats, QuantityUnitsResponse
from app.services.home_network import primary_lan_ipv4
from app.units import UNITS_BY_KIND, QuantityKind

router = APIRouter(prefix="/meta", tags=["meta"])


@router.get("/quantity-units", response_model=QuantityUnitsResponse)
def quantity_units() -> QuantityUnitsResponse:
    kinds: dict[QuantityKind, list[str]] = {
        kind: list(units) for kind, units in UNITS_BY_KIND.items()
    }
    return QuantityUnitsResponse(kinds=kinds)


@router.get("/home-network", response_model=HomeNetworkResponse)
def home_network() -> HomeNetworkResponse:
    lan = primary_lan_ipv4()
    api_base = f"http://{lan}:8000" if lan else None
    expo = f"exp://{lan}:8081" if lan else None
    return HomeNetworkResponse(lan_host=lan, api_base_url=api_base, expo_go_url=expo)


@router.get("/product-catalog", response_model=ProductCatalogStats)
def product_catalog_stats(db: Session = Depends(get_db)) -> ProductCatalogStats:
    count = db.query(Product).count()
    sample_count = db.query(Product).filter(Product.source == "sample").count() if count else 0
    return ProductCatalogStats(product_count=count, sample_seeded=sample_count > 0)
