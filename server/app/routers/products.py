from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ingredient, Product, ShoppingList, ShoppingListItem
from app.schemas import BarcodeScanRequest, BarcodeScanResponse, ProductCreate, ProductRead
from app.services.barcode import normalize_barcode
from app.units import default_unit

router = APIRouter(tags=["products"])


def _resolve_quantity_fields(
    body: BarcodeScanRequest, product: Product | None
) -> tuple[str, float | None, str | None]:
    kind = body.quantity_kind
    if product and product.default_quantity_kind and body.unit is None:
        kind = product.default_quantity_kind
    unit = body.unit
    quantity = body.quantity
    if quantity is not None and unit is None:
        unit = default_unit(kind)
    return kind, quantity, unit


def _upsert_product(
    db: Session,
    *,
    barcode: str,
    name: str,
    brand: str | None = None,
    default_quantity_kind: str | None = None,
    source: str,
) -> Product:
    code = normalize_barcode(barcode)
    row = db.get(Product, code)
    if row:
        row.name = name
        row.brand = brand
        row.source = source
        if default_quantity_kind is not None:
            row.default_quantity_kind = default_quantity_kind
    else:
        row = Product(
            barcode=code,
            name=name,
            brand=brand,
            default_quantity_kind=default_quantity_kind,
            source=source,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/products/{barcode}", response_model=ProductRead | None)
def get_product(barcode: str, db: Session = Depends(get_db)) -> Product | None:
    return db.get(Product, normalize_barcode(barcode))


@router.post("/products", response_model=ProductRead, status_code=201)
def create_product(body: ProductCreate, db: Session = Depends(get_db)) -> Product:
    """Register a packaged item by barcode (family catalog, not yet in Open Food Facts import)."""
    code = normalize_barcode(body.barcode)
    if db.get(Product, code):
        raise HTTPException(
            status_code=409,
            detail="Product barcode already exists",
        )
    return _upsert_product(
        db,
        barcode=code,
        name=body.name.strip(),
        brand=body.brand,
        default_quantity_kind=body.default_quantity_kind,
        source="manual",
    )


@router.post("/scan/barcode", response_model=BarcodeScanResponse)
def scan_barcode(body: BarcodeScanRequest, db: Session = Depends(get_db)) -> BarcodeScanResponse:
    code = normalize_barcode(body.barcode)
    product = db.get(Product, code)

    if body.manual_name and body.register_product:
        product = _upsert_product(
            db,
            barcode=code,
            name=body.manual_name.strip(),
            source="manual",
        )

    name = body.manual_name or (product.name if product else None)
    if not name:
        return BarcodeScanResponse(
            barcode=code,
            product=ProductRead.model_validate(product) if product else None,
            unknown=True,
        )

    quantity_kind, quantity, unit = _resolve_quantity_fields(body, product)

    if body.target == "inventory":
        row = Ingredient(
            name=name,
            quantity=quantity,
            quantity_kind=quantity_kind,
            unit=unit,
            barcode=code,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return BarcodeScanResponse(
            barcode=code,
            product=ProductRead.model_validate(product) if product else None,
            unknown=product is None and body.manual_name is None,
            ingredient_id=row.id,
        )

    if body.shopping_list_id is None:
        raise HTTPException(
            status_code=400, detail="shopping_list_id required for shopping_list target"
        )
    shopping_list = db.get(ShoppingList, body.shopping_list_id)
    if not shopping_list:
        raise HTTPException(status_code=404, detail="Shopping list not found")

    item = ShoppingListItem(
        shopping_list_id=body.shopping_list_id,
        name=name,
        quantity=quantity,
        quantity_kind=quantity_kind,
        unit=unit,
        barcode=code,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return BarcodeScanResponse(
        barcode=code,
        product=ProductRead.model_validate(product) if product else None,
        unknown=product is None and body.manual_name is None,
        shopping_list_item_id=item.id,
    )
