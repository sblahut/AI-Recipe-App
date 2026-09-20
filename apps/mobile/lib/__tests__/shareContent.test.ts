import { formatRecipeShare, formatShoppingListShare } from "@/lib/shareContent";
import type { GeneratedRecipe, ShoppingListDetail } from "@/lib/schemas";

const recipe: GeneratedRecipe = {
  title: "Tomato Soup",
  servings: 4,
  prep_minutes: 30,
  ingredients: [
    { name: "tomatoes", quantity: "2 cans" },
    { name: "basil", quantity: null },
  ],
  steps: ["Simmer", "Blend"],
};

describe("formatRecipeShare", () => {
  it("includes title, meta, ingredients, and steps", () => {
    const text = formatRecipeShare(recipe);
    expect(text).toContain("Tomato Soup");
    expect(text).toContain("Serves 4 · 30 min");
    expect(text).toContain("- tomatoes (2 cans)");
    expect(text).toContain("- basil");
    expect(text).toContain("1. Simmer");
    expect(text).toContain("2. Blend");
  });
});

describe("formatShoppingListShare", () => {
  it("formats empty list", () => {
    const list: ShoppingListDetail = {
      id: 1,
      name: "Weekly",
      done: false,
      created_at: "2026-01-01T00:00:00Z",
      items: [],
    };
    expect(formatShoppingListShare(list)).toBe("Weekly\n\n(empty list)");
  });

  it("marks checked items and shows quantity", () => {
    const list: ShoppingListDetail = {
      id: 1,
      name: "Weekly",
      done: false,
      created_at: "2026-01-01T00:00:00Z",
      items: [
        {
          id: 1,
          shopping_list_id: 1,
          name: "milk",
          quantity: 2,
          quantity_kind: "volume",
          unit: "l",
          barcode: null,
          checked: true,
        },
        {
          id: 2,
          shopping_list_id: 1,
          name: "bread",
          quantity: null,
          quantity_kind: "count",
          unit: null,
          barcode: null,
          checked: false,
        },
      ],
    };
    const text = formatShoppingListShare(list);
    expect(text).toContain("- [x] milk (2 l)");
    expect(text).toContain("- [ ] bread");
  });
});
