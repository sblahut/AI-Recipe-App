import type { GeneratedRecipe } from "@/lib/schemas";
import {
  formatRecipeSourceMetaLine,
  getRecipeBogoSourceNames,
  getRecipePantrySourceNames,
} from "@/lib/recipeSourceLists";

const base: GeneratedRecipe = {
  title: "Test",
  ingredients: [],
  steps: [],
};

describe("recipeSourceLists", () => {
  it("splits explicit pantry and BOGO fields", () => {
    const recipe: GeneratedRecipe = {
      ...base,
      uses_from_pantry: ["milk", "eggs"],
      uses_from_publix_bogo: ["Cheerios (Publix BOGO)"],
    };
    expect(getRecipePantrySourceNames(recipe)).toEqual(["milk", "eggs"]);
    expect(getRecipeBogoSourceNames(recipe)).toEqual(["Cheerios"]);
    expect(formatRecipeSourceMetaLine(recipe)).toBe("2 in pantry · 1 on Publix BOGO");
  });

  it("reads legacy BOGO labels from uses_from_pantry only", () => {
    const recipe: GeneratedRecipe = {
      ...base,
      uses_from_pantry: ["rice", "Oreos (Publix BOGO)"],
    };
    expect(getRecipePantrySourceNames(recipe)).toEqual(["rice"]);
    expect(getRecipeBogoSourceNames(recipe)).toEqual(["Oreos"]);
  });
});
