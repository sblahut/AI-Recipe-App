import { sortPantryItems } from "@/lib/pantrySort";
import type { Ingredient } from "@/lib/schemas";

function item(partial: Partial<Ingredient> & Pick<Ingredient, "id" | "name">): Ingredient {
  return {
    quantity: null,
    quantity_kind: "count",
    unit: null,
    location: null,
    notes: null,
    barcode: null,
    expires_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("sortPantryItems", () => {
  it("sorts by name", () => {
    const sorted = sortPantryItems(
      [item({ id: 1, name: "Zucchini" }), item({ id: 2, name: "Apple" })],
      "name",
    );
    expect(sorted.map((row) => row.name)).toEqual(["Apple", "Zucchini"]);
  });

  it("sorts by expiry soonest first", () => {
    const sorted = sortPantryItems(
      [
        item({ id: 1, name: "B", expires_at: "2030-01-01T00:00:00.000Z" }),
        item({ id: 2, name: "A", expires_at: "2026-01-01T00:00:00.000Z" }),
      ],
      "expiry",
    );
    expect(sorted[0]?.name).toBe("A");
  });
});
