from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import ShoppingList, ShoppingListItem
from app.schemas import (
    ShoppingListCreate,
    ShoppingListDetail,
    ShoppingListItemCreate,
    ShoppingListItemRead,
    ShoppingListRead,
)

router = APIRouter(prefix="/shopping", tags=["shopping"])


@router.get("/lists", response_model=list[ShoppingListRead])
def list_shopping_lists(db: Session = Depends(get_db)) -> list[ShoppingList]:
    return db.query(ShoppingList).order_by(ShoppingList.created_at.desc()).all()


@router.post("/lists", response_model=ShoppingListRead, status_code=201)
def create_shopping_list(body: ShoppingListCreate, db: Session = Depends(get_db)) -> ShoppingList:
    row = ShoppingList(name=body.name)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/lists/{list_id}", response_model=ShoppingListDetail)
def get_shopping_list(list_id: int, db: Session = Depends(get_db)) -> ShoppingList:
    row = (
        db.query(ShoppingList)
        .options(joinedload(ShoppingList.items))
        .filter(ShoppingList.id == list_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    return row


@router.post("/lists/{list_id}/items", response_model=ShoppingListItemRead, status_code=201)
def add_shopping_item(
    list_id: int, body: ShoppingListItemCreate, db: Session = Depends(get_db)
) -> ShoppingListItem:
    if not db.get(ShoppingList, list_id):
        raise HTTPException(status_code=404, detail="Shopping list not found")
    item = ShoppingListItem(shopping_list_id=list_id, **body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/lists/{list_id}/items/{item_id}", response_model=ShoppingListItemRead)
def update_shopping_item(
    list_id: int,
    item_id: int,
    checked: bool | None = None,
    db: Session = Depends(get_db),
) -> ShoppingListItem:
    item = db.get(ShoppingListItem, item_id)
    if not item or item.shopping_list_id != list_id:
        raise HTTPException(status_code=404, detail="Item not found")
    if checked is not None:
        item.checked = checked
    db.commit()
    db.refresh(item)
    return item
