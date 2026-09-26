import json
from datetime import datetime
from typing import TYPE_CHECKING, Literal

if TYPE_CHECKING:
    from app.models import SavedRecipe

from pydantic import BaseModel, Field, field_validator, model_validator

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
    default_quantity: float | None = None
    default_unit: str | None = None
    source: str | None = None

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    barcode: str
    name: str
    brand: str | None = None
    default_quantity_kind: QuantityKindField | None = None
    default_quantity: float | None = None
    default_unit: str | None = None


class BarcodeScanRequest(QuantityFieldsMixin):
    barcode: str
    target: Literal["inventory", "shopping_list"] = "inventory"
    shopping_list_id: int | None = None
    location: str | None = Field(
        default=None,
        description="Storage location when target is inventory (fridge, pantry, etc.)",
    )
    manual_name: str | None = None
    register_product: bool = Field(
        default=False,
        description="When barcode is unknown, save manual_name to the local product catalog",
    )
    use_product_defaults: bool = Field(
        default=True,
        description="When true, quantity is package count and size comes from the product catalog",
    )
    expires_at: datetime | None = None


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
    persist_generated: bool | None = Field(
        default=None,
        description="When true, save each generated recipe as a favorite. When omitted, uses server default.",
    )


class RecipePublixBogoGenerateRequest(BaseModel):
    count: int = Field(default=3, ge=1, le=10)
    constraints: str | None = None
    persist_generated: bool | None = Field(
        default=None,
        description="When true, save each generated recipe as a favorite. When omitted, uses server default.",
    )
    publix_store_number: int | None = Field(
        default=None,
        ge=1,
        description="Publix store number for weekly-ad pricing. Falls back to server PUBLIX_STORE_NUMBER.",
    )


class RecipeGenerateSourcesRequest(BaseModel):
    use_pantry: bool = False
    use_publix_bogo: bool = False
    query: str | None = Field(default=None, max_length=500)
    count: int = Field(default=3, ge=1, le=10)
    constraints: str | None = None
    prioritize_expiring: bool = True
    persist_generated: bool | None = Field(
        default=None,
        description="When true, save each generated recipe as a favorite. When omitted, uses server default.",
    )
    publix_store_number: int | None = Field(
        default=None,
        ge=1,
        description="Publix store number for weekly-ad BOGO. Falls back to server PUBLIX_STORE_NUMBER.",
    )


class RecipeIngredient(BaseModel):
    name: str
    quantity: str | None = None

    @field_validator("quantity", mode="before")
    @classmethod
    def coerce_quantity_to_string(cls, value: object) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            return value
        if isinstance(value, bool):
            raise ValueError("quantity must be a string or number")
        if isinstance(value, int | float):
            return str(value)
        return str(value)


class GeneratedRecipe(BaseModel):
    title: str
    servings: int | None = None
    prep_minutes: int | None = None
    ingredients: list[RecipeIngredient]
    steps: list[str]
    uses_from_pantry: list[str] = Field(default_factory=list)
    uses_from_publix_bogo: list[str] = Field(default_factory=list)


class RecipeGenerateResponse(BaseModel):
    recipes: list[GeneratedRecipe]
    saved_recipes: list["SavedRecipeRead"] = Field(default_factory=list)


class RecipeSearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=500)
    count: int = Field(default=3, ge=1, le=10)
    constraints: str | None = None
    persist_generated: bool | None = Field(
        default=None,
        description="When true, save each result as a favorite. When omitted, uses server default.",
    )


class RecipeImportRequest(BaseModel):
    text: str | None = Field(default=None, max_length=50_000)
    url: str | None = Field(default=None, max_length=2048)
    persist: bool | None = Field(
        default=None,
        description="Save on server when true. When omitted, uses DEFAULT_PERSIST_GENERATED_RECIPES.",
    )
    favorite: bool = False

    @model_validator(mode="after")
    def exactly_one_import_source(self) -> "RecipeImportRequest":
        text = (self.text or "").strip()
        url = (self.url or "").strip()
        if bool(text) == bool(url):
            raise ValueError("Provide exactly one of text or url")
        if text and len(text) < 20:
            raise ValueError("text must be at least 20 characters")
        return self


class RecipeImportResponse(BaseModel):
    recipe: GeneratedRecipe
    saved_recipe: "SavedRecipeRead | None" = None


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


class HomeNetworkResponse(BaseModel):
    lan_host: str | None = None
    api_base_url: str | None = None
    expo_go_url: str | None = None


class ProductCatalogStats(BaseModel):
    product_count: int
    sample_seeded: bool


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


class ShoppingFromRecipeRequest(BaseModel):
    list_id: int
    recipe: GeneratedRecipe | None = None
    saved_recipe_id: int | None = None
    skip_pantry_check: bool = False

    @model_validator(mode="after")
    def exactly_one_recipe_source(self) -> "ShoppingFromRecipeRequest":
        has_recipe = self.recipe is not None
        has_id = self.saved_recipe_id is not None
        if has_recipe == has_id:
            raise ValueError("Provide exactly one of recipe or saved_recipe_id")
        return self


class ShoppingFromRecipeResponse(BaseModel):
    added: list[ShoppingListItemRead]
    skipped_in_pantry: list[str]


MealSlotField = Literal["breakfast", "lunch", "dinner", "snack"]


class MealPlanEntryCreate(BaseModel):
    plan_date: str = Field(max_length=10)
    meal_slot: MealSlotField
    saved_recipe_id: int

    @field_validator("plan_date")
    @classmethod
    def validate_plan_date(cls, value: str) -> str:
        from app.services.meal_plan_range import parse_plan_date

        parse_plan_date(value)
        return value


class MealPlanEntryUpdate(BaseModel):
    plan_date: str | None = Field(default=None, max_length=10)
    meal_slot: MealSlotField | None = None
    saved_recipe_id: int | None = None

    @field_validator("plan_date")
    @classmethod
    def validate_plan_date(cls, value: str | None) -> str | None:
        if value is None:
            return None
        from app.services.meal_plan_range import parse_plan_date

        parse_plan_date(value)
        return value


class MealPlanEntryRead(BaseModel):
    id: int
    plan_date: str
    meal_slot: MealSlotField
    saved_recipe_id: int
    recipe_title: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ShoppingFromMealPlanRequest(BaseModel):
    list_id: int
    start_date: str = Field(max_length=10)
    end_date: str = Field(max_length=10)
    skip_pantry_check: bool = False

    @model_validator(mode="after")
    def validate_range(self) -> "ShoppingFromMealPlanRequest":
        from app.services.meal_plan_range import validate_plan_date_range

        validate_plan_date_range(self.start_date, self.end_date)
        return self


class ShoppingFromMealPlanResponse(BaseModel):
    added: list[ShoppingListItemRead]
    skipped_in_pantry: list[str]
    missing_entry_ids: list[int] = Field(
        default_factory=list,
        description="Meal plan rows whose saved recipe was deleted",
    )
    meals_processed: int = 0


RecipeGenerateResponse.model_rebuild()
RecipeImportResponse.model_rebuild()
