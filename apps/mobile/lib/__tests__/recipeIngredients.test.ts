import { recipeToIngredientCreates } from "@/lib/recipeIngredients";
import type { GeneratedRecipe } from "@/lib/schemas";

function recipe(ingredients: GeneratedRecipe["ingredients"]): GeneratedRecipe {
  return {
    title: "Test",
    ingredients,
    steps: ["mix"],
  };
}

describe("recipeToIngredientCreates", () => {
  it("parses weight, volume, and count quantities", () => {
    const rows = recipeToIngredientCreates(
      recipe([
        { name: "flour", quantity: "200 g" },
        { name: "milk", quantity: "1 cup" },
        { name: "eggs", quantity: "3 each" },
      ]),
      "fridge",
    );

    expect(rows[0]).toMatchObject({
      name: "flour",
      quantity: 200,
      quantity_kind: "weight",
      unit: "g",
      location: "fridge",
    });
    expect(rows[1]).toMatchObject({
      name: "milk",
      quantity_kind: "volume",
      unit: "cup",
    });
    expect(rows[2]).toMatchObject({
      name: "eggs",
      quantity: 3,
      quantity_kind: "count",
    });
  });

  it("leaves quantity unset when text cannot be parsed", () => {
    const rows = recipeToIngredientCreates(
      recipe([{ name: "salt", quantity: "to taste" }]),
      "pantry",
    );
    expect(rows[0]).toMatchObject({
      name: "salt",
      quantity: null,
      quantity_kind: "count",
      location: "pantry",
    });
  });
});
