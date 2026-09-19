import json
from datetime import datetime
from typing import TYPE_CHECKING, Literal

if TYPE_CHECKING:
    from app.models import SavedRecipe

from pydantic import BaseModel, Field, model_validator

from app.units import QuantityKind, default_unit, validate_unit_for_kind

QuantityKindField = Literal["count", "weight", "volume"]


class QuantityFieldsMixin(BaseModel):
    quantity: float | None = None
    quantity_kind: QuantityKindField = "count"
    unit: str | None = None

    @model_validator(mode="after")
    def normalize_and_validate_quantity(self) -> "QuantityFieldsMixin":
        if self.quantity is not None and self.quantity < 0:
            raise ValueError("quantity must be non-negative")
        if self.unit is not None:
            self.unit = validate_unit_for_kind(self.quantity_kind, self.unit)
        elif self.quantity is not None:
            self.unit = default_unit(self.quantity_kind)
        return self


class IngredientCreate(QuantityFieldsMixin):
    name: str
    location: str | None = None
    barcode: str | None = None
    expires_at: datetime | None = None
    notes: str | None = None


class IngredientUpdate(BaseModel):
    name: str | None = None
    quantity: float | None = None
    quantity_kind: QuantityKindField | None = None
    unit: str | None = None
    location: str | None = None
    barcode: str | None = None
    expires_at: datetime | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_quantity_fields(self) -> "IngredientUpdate":
        if self.quantity is not None and self.quantity < 0:
            raise ValueError("quantity must be non-negative")
        if self.unit is not None:
            kind = self.quantity_kind or "count"
            self.unit = validate_unit_for_kind(kind, self.unit)
        return self


class IngredientRead(IngredientCreate):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class IngredientBulkCreate(BaseModel):
    items: list[IngredientCreate]


class ProductRead(BaseModel):
    barcode: str
    name: str
    brand: str | None = None
    default_quantity_kind: QuantityKindField | None = None

    model_config = {"from_attributes": True}


class BarcodeScanRequest(QuantityFieldsMixin):
    barcode: str
    target: Literal["inventory", "shopping_list"] = "inventory"
    shopping_list_id: int | None = None
    manual_name: str | None = None


class BarcodeScanResponse(BaseModel):
    barcode: str
    product: ProductRead | None = None
    unknown: bool = False
    ingredient_id: int | None = None
    shopping_list_item_id: int | None = None


class RecipeGenerateRequest(BaseModel):
    ingredient_ids: list[int] | None = None
    use_all: bool = False
    count: int = Field(default=3, ge=1, le=10)
    constraints: str | None = None
    prioritize_expiring: bool = True


class RecipeIngredient(BaseModel):
    name: str
    quantity: str | None = None


class GeneratedRecipe(BaseModel):
    title: str
    servings: int | None = None
    prep_minutes: int | None = None
    ingredients: list[RecipeIngredient]
    steps: list[str]
    uses_from_pantry: list[str] = Field(default_factory=list)


class RecipeGenerateResponse(BaseModel):
    recipes: list[GeneratedRecipe]


class SavedRecipeCreate(BaseModel):
    recipe: GeneratedRecipe
    favorite: bool = False


class SavedRecipeRead(BaseModel):
    id: int
    title: str
    recipe: GeneratedRecipe
    favorite: bool
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_row(cls, row: "SavedRecipe") -> "SavedRecipeRead":
        payload = json.loads(row.payload_json)
        recipe = GeneratedRecipe.model_validate(payload)
        return cls(
            id=row.id,
            title=row.title,
            recipe=recipe,
            favorite=row.favorite,
            created_at=row.created_at,
        )


class QuantityUnitsResponse(BaseModel):
    kinds: dict[QuantityKind, list[str]]


class ShoppingListCreate(BaseModel):
    name: str


class ShoppingListRead(BaseModel):
    id: int
    name: str
    done: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ShoppingListItemCreate(QuantityFieldsMixin):
    name: str
    barcode: str | None = None


class ShoppingListItemRead(ShoppingListItemCreate):
    id: int
    shopping_list_id: int
    checked: bool

    model_config = {"from_attributes": True}


class ShoppingListDetail(ShoppingListRead):
    items: list[ShoppingListItemRead]
