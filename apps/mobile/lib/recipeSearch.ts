import type { GeneratedRecipe } from "@/lib/schemas";
import { textMatchesSearch } from "@/lib/textSearch";

export function recipeMatchesSearch(recipe: GeneratedRecipe, query: string): boolean {
  if (!textMatchesSearch(query, recipe.title)) {
    return recipe.ingredients.some((line) => textMatchesSearch(query, line.name));
  }
  return true;
}
