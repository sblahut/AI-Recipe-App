import re

from app.schemas import GeneratedRecipe, RecipeIngredient


def normalize_display_text(text: str) -> str:
    """Turn model markdown / escaped newlines into plain, readable text."""
    cleaned = text.strip()
    if not cleaned:
        return cleaned

    if "\\n" in cleaned:
        cleaned = cleaned.replace("\\n", "\n")
    if "\\t" in cleaned:
        cleaned = cleaned.replace("\\t", "\t")

    cleaned = re.sub(r"```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.replace("```", "")

    cleaned = re.sub(r"\*\*([^*]+)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"__([^_]+)__", r"\1", cleaned)
    cleaned = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"\1", cleaned)
    cleaned = re.sub(r"`([^`]+)`", r"\1", cleaned)
    cleaned = re.sub(r"^#{1,6}\s+", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"^\s*[-*]\s+", "• ", cleaned, flags=re.MULTILINE)

    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def normalize_generated_recipe(recipe: GeneratedRecipe) -> GeneratedRecipe:
    ingredients = [
        RecipeIngredient(
            name=normalize_display_text(line.name),
            quantity=normalize_display_text(line.quantity) if line.quantity else line.quantity,
        )
        for line in recipe.ingredients
    ]
    return GeneratedRecipe(
        title=normalize_display_text(recipe.title),
        servings=recipe.servings,
        prep_minutes=recipe.prep_minutes,
        ingredients=ingredients,
        steps=[normalize_display_text(step) for step in recipe.steps],
        uses_from_pantry=[normalize_display_text(name) for name in recipe.uses_from_pantry],
        uses_from_publix_bogo=[normalize_display_text(name) for name in recipe.uses_from_publix_bogo],
    )
