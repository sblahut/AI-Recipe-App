import {
  GENERATE_RECIPES_LABEL,
  RECIPE_USE_PANTRY_INGREDIENTS_LABEL,
  RECIPE_USE_PUBLIX_BOGO_LABEL,
  RECIPE_MEAL_PLAN_BUTTON_LABEL,
  RECIPE_SHOPPING_LIST_BUTTON_LABEL,
  SHOPPING_OPEN_LIST_LABEL,
  SHOPPING_STOCK_FROM_LIST_LABEL,
  shareRecipeAccessibilityLabel,
  shareShoppingListAccessibilityLabel,
} from "@/lib/uiActionLabels";

describe("uiActionLabels", () => {
  it("uses recipe and shopping action labels", () => {
    expect(SHOPPING_STOCK_FROM_LIST_LABEL).toBe("Add to pantry");
    expect(SHOPPING_OPEN_LIST_LABEL).toBe("Shop this list");
    expect(RECIPE_SHOPPING_LIST_BUTTON_LABEL).toBe("+ Shopping list");
    expect(RECIPE_MEAL_PLAN_BUTTON_LABEL).toBe("+ Meal plan");
    expect(GENERATE_RECIPES_LABEL).toBe("Generate Recipes");
    expect(RECIPE_USE_PANTRY_INGREDIENTS_LABEL).toBe("Use ingredients from pantry");
    expect(RECIPE_USE_PUBLIX_BOGO_LABEL).toBe("Use ingredients from Publix BOGO list");
  });

  it("builds share accessibility labels", () => {
    expect(shareShoppingListAccessibilityLabel("Weekly")).toBe("Share shopping list Weekly");
    expect(shareRecipeAccessibilityLabel("Tomato Soup")).toBe("Share recipe Tomato Soup");
  });
});
