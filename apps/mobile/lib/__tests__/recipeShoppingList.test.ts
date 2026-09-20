import { shoppingListResultMessage } from "@/lib/recipeShoppingListMessages";

describe("shoppingListResultMessage", () => {
  it("describes added items", () => {
    const result = shoppingListResultMessage("Wegmans", 3, 1);
    expect(result.title).toBe("Shopping list updated");
    expect(result.message).toContain("Wegmans");
  });

  it("describes all stocked", () => {
    const result = shoppingListResultMessage("Wegmans", 0, 2);
    expect(result.title).toBe("Already stocked");
    expect(result.message.toLowerCase()).not.toContain("pantry");
  });
});
