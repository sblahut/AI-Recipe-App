import { formatShoppingQty } from "@/lib/formatShoppingQty";
import type { ShoppingListItem } from "@/lib/schemas";

function item(partial: Partial<ShoppingListItem>): ShoppingListItem {
  return {
    id: 1,
    shopping_list_id: 1,
    name: "milk",
    quantity: null,
    quantity_kind: "volume",
    unit: null,
    barcode: null,
    checked: false,
    ...partial,
  };
}

describe("formatShoppingQty", () => {
  it("shows placeholder when quantity is missing", () => {
    expect(formatShoppingQty(item({ quantity: null }))).toBe("No quantity set");
  });

  it("formats quantity with unit", () => {
    expect(formatShoppingQty(item({ quantity: 2, unit: "gal" }))).toBe("2 gal");
  });
});
