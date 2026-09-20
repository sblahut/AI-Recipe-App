import { findFavoriteMatch } from "@/lib/recipeFavorites";
import type { GeneratedRecipe, SavedRecipe } from "@/lib/schemas";

const recipe: GeneratedRecipe = {
  title: "Tomato Soup",
  ingredients: [],
  steps: [],
};

describe("findFavoriteMatch", () => {
  it("matches by title case-insensitively", () => {
    const favorites: SavedRecipe[] = [
      {
        id: 1,
        title: "tomato soup",
        recipe,
        favorite: true,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    expect(findFavoriteMatch(favorites, recipe)?.id).toBe(1);
  });
});
