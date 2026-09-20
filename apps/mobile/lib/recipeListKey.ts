import type { GeneratedRecipe } from "@/lib/schemas";

/** Stable list key when titles repeat (common with AI results). */
export function recipeListKey(recipe: GeneratedRecipe, index: number): string {
  const title = recipe.title.trim().toLowerCase().replace(/\s+/g, "-");
  const ingHint = recipe.ingredients[0]?.name.trim().toLowerCase() ?? "";
  return `${index}-${title}-${ingHint}`;
}
