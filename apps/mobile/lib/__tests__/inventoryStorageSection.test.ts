import { storageSectionIdForItem } from "@/lib/inventoryStorageSection";
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
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...partial,
  };
}

describe("storageSectionIdForItem", () => {
  const customZones = ["Garage fridge"];

  it("maps empty location to Unassigned", () => {
    expect(storageSectionIdForItem(item({ id: 1, name: "Salt" }), customZones)).toBe(
      "Unassigned",
    );
  });

  it("maps builtin zones by name", () => {
    expect(
      storageSectionIdForItem(item({ id: 1, name: "Milk", location: "Fridge" }), customZones),
    ).toBe("Fridge");
  });

  it("maps custom zones", () => {
    expect(
      storageSectionIdForItem(
        item({ id: 1, name: "Beer", location: "Garage fridge" }),
        customZones,
      ),
    ).toBe("Garage fridge");
  });

  it("maps unknown locations to Other", () => {
    expect(
      storageSectionIdForItem(item({ id: 1, name: "Box", location: "Attic" }), customZones),
    ).toBe("Other");
  });
});
