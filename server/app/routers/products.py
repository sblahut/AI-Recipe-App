from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ingredient, Product, ShoppingList, ShoppingListItem
from app.schemas import BarcodeScanRequest, BarcodeScanResponse, ProductRead
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


@router.get("/products/{barcode}", response_model=ProductRead | None)
def get_product(barcode: str, db: Session = Depends(get_db)) -> Product | None:
    return db.get(Product, barcode)


@router.post("/scan/barcode", response_model=BarcodeScanResponse)
def scan_barcode(body: BarcodeScanRequest, db: Session = Depends(get_db)) -> BarcodeScanResponse:
    product = db.get(Product, body.barcode)
    name = body.manual_name or (product.name if product else None)
    if not name:
        return BarcodeScanResponse(
            barcode=body.barcode,
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
            barcode=body.barcode,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return BarcodeScanResponse(
            barcode=body.barcode,
            product=ProductRead.model_validate(product) if product else None,
            unknown=product is None and body.manual_name is None,
            ingredient_id=row.id,
        )

    if body.shopping_list_id is None:
        raise HTTPException(status_code=400, detail="shopping_list_id required for shopping_list target")
    shopping_list = db.get(ShoppingList, body.shopping_list_id)
    if not shopping_list:
        raise HTTPException(status_code=404, detail="Shopping list not found")

    item = ShoppingListItem(
        shopping_list_id=body.shopping_list_id,
        name=name,
        quantity=quantity,
        quantity_kind=quantity_kind,
        unit=unit,
        barcode=body.barcode,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return BarcodeScanResponse(
        barcode=body.barcode,
        product=ProductRead.model_validate(product) if product else None,
        unknown=product is None and body.manual_name is None,
        shopping_list_item_id=item.id,
    )
