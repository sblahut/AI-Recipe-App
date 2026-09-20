import type { GeneratedRecipe, SavedRecipe } from "@/lib/schemas";

export function findFavoriteMatch(
  favorites: SavedRecipe[],
  recipe: GeneratedRecipe,
): SavedRecipe | undefined {
  const title = recipe.title.trim().toLowerCase();
  return favorites.find((row) => row.recipe.title.trim().toLowerCase() === title);
}
