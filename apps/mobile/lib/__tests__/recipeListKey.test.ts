import { recipeListKey } from "@/lib/recipeListKey";
import type { GeneratedRecipe } from "@/lib/schemas";

describe("recipeListKey", () => {
  it("differs for same title at different indexes", () => {
    const recipe: GeneratedRecipe = {
      title: "Soup",
      ingredients: [{ name: "broth", quantity: "1" }],
      steps: ["simmer"],
    };
    expect(recipeListKey(recipe, 0)).not.toBe(recipeListKey(recipe, 1));
  });
});
