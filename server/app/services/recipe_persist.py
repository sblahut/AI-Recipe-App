from collections.abc import Iterable

from sqlalchemy.orm import Session

from app.models import SavedRecipe
from app.schemas import GeneratedRecipe, SavedRecipeRead


def persist_generated_recipes_as_favorites(
    db: Session, recipes: Iterable[GeneratedRecipe]
) -> list[SavedRecipeRead]:
    """Save generated/search results as favorites (matches Recipes tab + meal plan expectations)."""
    saved_reads: list[SavedRecipeRead] = []
    for recipe in recipes:
        row = SavedRecipe(
            title=recipe.title,
            payload_json=recipe.model_dump_json(),
            favorite=True,
        )
        db.add(row)
        db.flush()
        saved_reads.append(SavedRecipeRead.from_orm_row(row))
    db.commit()
    return saved_reads


def import_recipe_should_persist(*, persist: bool, favorite: bool) -> bool:
    return persist or favorite


def import_recipe_favorite_flag(*, persist: bool, favorite: bool) -> bool:
    return favorite or persist
