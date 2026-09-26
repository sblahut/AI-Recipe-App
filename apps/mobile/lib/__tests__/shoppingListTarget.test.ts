import {
  findShoppingListById,
  resolveDefaultShoppingList,
  skipPantryCheckFromPreferences,
} from "@/lib/shoppingListTarget";
import type { ShoppingList } from "@/lib/schemas";

const lists: ShoppingList[] = [
  {
    id: 1,
    name: "Weekly",
    done: false,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Party",
    done: false,
    created_at: "2026-01-02T00:00:00Z",
  },
];

describe("shoppingListTarget", () => {
  it("finds list by id", () => {
    expect(findShoppingListById(lists, 2)?.name).toBe("Party");
    expect(findShoppingListById(lists, null)).toBeNull();
  });

  it("resolves default shopping list from preferences", () => {
    expect(resolveDefaultShoppingList(lists, { defaultShoppingListId: 1 })?.name).toBe("Weekly");
    expect(resolveDefaultShoppingList(lists, { defaultShoppingListId: null })).toBeNull();
  });

  it("maps omit-pantry preference to skip flag", () => {
    expect(skipPantryCheckFromPreferences({ omitPantryItemsFromShoppingLists: true })).toBe(false);
    expect(skipPantryCheckFromPreferences({ omitPantryItemsFromShoppingLists: false })).toBe(true);
    expect(skipPantryCheckFromPreferences({})).toBe(false);
  });
});
