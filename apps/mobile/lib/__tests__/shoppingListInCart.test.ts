import { shoppingListItemsInCart } from "@/lib/shoppingListInCart";
import type { ShoppingListItem } from "@/lib/schemas";

function line(checked: boolean): ShoppingListItem {
  return {
    id: 1,
    shopping_list_id: 1,
    name: "item",
    quantity: null,
    quantity_kind: "count",
    unit: null,
    barcode: null,
    checked,
  };
}

describe("shoppingListItemsInCart", () => {
  it("returns only checked lines", () => {
    const inCart = shoppingListItemsInCart([line(false), line(true), line(true)]);
    expect(inCart).toHaveLength(2);
    expect(inCart.every((row) => row.checked)).toBe(true);
  });
});
