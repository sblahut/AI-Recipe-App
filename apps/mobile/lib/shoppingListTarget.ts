import type { ShoppingList } from "@/lib/schemas";
import type { UserPreferences } from "@/lib/userPreferences";

export function findShoppingListById(
  lists: ShoppingList[],
  listId: number | null | undefined,
): ShoppingList | null {
  if (listId == null) {
    return null;
  }
  return lists.find((list) => list.id === listId) ?? null;
}

/** Preferred list for recipe / meal-plan adds when user set a default. */
export function resolveDefaultShoppingList(
  lists: ShoppingList[],
  preferences: Pick<UserPreferences, "defaultShoppingListId">,
): ShoppingList | null {
  return findShoppingListById(lists, preferences.defaultShoppingListId);
}

export function skipPantryCheckFromPreferences(
  preferences: Pick<UserPreferences, "omitPantryItemsFromShoppingLists">,
): boolean {
  return !(preferences.omitPantryItemsFromShoppingLists ?? true);
}
