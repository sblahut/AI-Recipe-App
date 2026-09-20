import {
  GENERATE_RECIPE_FROM_INGREDIENTS_LABEL,
  RECIPE_MEAL_PLAN_BUTTON_LABEL,
  RECIPE_SHOPPING_LIST_BUTTON_LABEL,
  SHOPPING_OPEN_LIST_LABEL,
  SHOPPING_STOCK_FROM_LIST_LABEL,
  shareRecipeAccessibilityLabel,
  shareShoppingListAccessibilityLabel,
} from "@/lib/uiActionLabels";

describe("uiActionLabels", () => {
  it("uses recipe and shopping action labels", () => {
    expect(SHOPPING_STOCK_FROM_LIST_LABEL).toBe("Add shopping cart to ingredients");
    expect(SHOPPING_OPEN_LIST_LABEL).toBe("Open list");
    expect(RECIPE_SHOPPING_LIST_BUTTON_LABEL).toBe("+ Shopping list");
    expect(RECIPE_MEAL_PLAN_BUTTON_LABEL).toBe("+ Meal plan");
    expect(GENERATE_RECIPE_FROM_INGREDIENTS_LABEL).toBe("Generate Recipe from Ingredients");
  });

  it("builds share accessibility labels", () => {
    expect(shareShoppingListAccessibilityLabel("Weekly")).toBe("Share shopping list Weekly");
    expect(shareRecipeAccessibilityLabel("Tomato Soup")).toBe("Share recipe Tomato Soup");
  });
});
