import { shoppingListResultMessage } from "@/lib/recipeShoppingListMessages";

describe("shoppingListResultMessage", () => {
  it("reports added items", () => {
    const result = shoppingListResultMessage("Groceries", 2, 0);
    expect(result.title).toBe("Shopping list updated");
    expect(result.message).toContain('2 items added to "Groceries"');
  });

  it("mentions skipped ingredients when some were already stocked", () => {
    const result = shoppingListResultMessage("Groceries", 1, 2);
    expect(result.message).toContain("already on your ingredients list");
  });

  it("handles all skipped", () => {
    const result = shoppingListResultMessage("Groceries", 0, 3);
    expect(result.title).toBe("Already stocked");
  });

  it("handles empty recipe lines", () => {
    const result = shoppingListResultMessage("Groceries", 0, 0);
    expect(result.title).toBe("Nothing to add");
  });
});
