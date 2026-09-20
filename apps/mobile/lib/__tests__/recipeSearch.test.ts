import { recipeMatchesSearch } from "@/lib/recipeSearch";
import type { GeneratedRecipe } from "@/lib/schemas";

const sampleRecipe: GeneratedRecipe = {
  title: "Tomato Soup",
  ingredients: [{ name: "canned tomatoes", quantity: "2" }],
  steps: ["Simmer"],
};

describe("recipeMatchesSearch", () => {
  it("matches title", () => {
    expect(recipeMatchesSearch(sampleRecipe, "tomato")).toBe(true);
  });

  it("matches ingredient when title does not", () => {
    expect(recipeMatchesSearch(sampleRecipe, "canned")).toBe(true);
  });

  it("returns false when nothing matches", () => {
    expect(recipeMatchesSearch(sampleRecipe, "basil")).toBe(false);
  });
});
