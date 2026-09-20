import {
  RECIPE_SHOPPING_LIST_BUTTON_LABEL,
  SHOPPING_OPEN_LIST_LABEL,
  SHOPPING_STOCK_FROM_LIST_LABEL,
  shareRecipeAccessibilityLabel,
  shareShoppingListAccessibilityLabel,
} from "@/lib/uiActionLabels";

describe("uiActionLabels", () => {
  it("uses short stock-from-list label for the secondary shopping action", () => {
    expect(SHOPPING_STOCK_FROM_LIST_LABEL).toBe("To ingredients");
    expect(SHOPPING_OPEN_LIST_LABEL).toBe("Open list");
    expect(RECIPE_SHOPPING_LIST_BUTTON_LABEL).toBe("Shopping list");
  });

  it("builds share accessibility labels", () => {
    expect(shareShoppingListAccessibilityLabel("Weekly")).toBe("Share shopping list Weekly");
    expect(shareRecipeAccessibilityLabel("Tomato Soup")).toBe("Share recipe Tomato Soup");
  });
});
