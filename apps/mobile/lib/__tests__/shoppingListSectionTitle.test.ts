import {
  defaultShoppingListExpanded,
  formatShoppingListCollapsibleTitle,
} from "@/lib/shoppingListSectionTitle";

describe("formatShoppingListCollapsibleTitle", () => {
  it("returns name only when count is unknown", () => {
    expect(formatShoppingListCollapsibleTitle("Groceries", undefined)).toBe("Groceries");
  });

  it("includes count when loaded", () => {
    expect(formatShoppingListCollapsibleTitle("Groceries", 12)).toBe("Groceries (12)");
  });
});

describe("defaultShoppingListExpanded", () => {
  it("expands the only list", () => {
    expect(defaultShoppingListExpanded(0, 1)).toBe(true);
  });

  it("expands first list when multiple exist", () => {
    expect(defaultShoppingListExpanded(0, 3)).toBe(true);
    expect(defaultShoppingListExpanded(1, 3)).toBe(false);
  });
});
