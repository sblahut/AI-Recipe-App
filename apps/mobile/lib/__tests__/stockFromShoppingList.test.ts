import { shoppingListItemsInCart } from "@/lib/shoppingListInCart";
import type { ShoppingListItem } from "@/lib/schemas";

function line(overrides: Partial<ShoppingListItem> & Pick<ShoppingListItem, "id" | "name">): ShoppingListItem {
  return {
    shopping_list_id: 1,
    quantity: 1,
    quantity_kind: "count",
    unit: "each",
    barcode: null,
    checked: false,
    ...overrides,
  };
}

describe("shoppingListItemsInCart", () => {
  it("returns only checked lines", () => {
    const items = [
      line({ id: 1, name: "Milk", checked: true }),
      line({ id: 2, name: "Eggs", checked: false }),
      line({ id: 3, name: "Bread", checked: true }),
    ];
    expect(shoppingListItemsInCart(items).map((row) => row.name)).toEqual(["Milk", "Bread"]);
  });
});
