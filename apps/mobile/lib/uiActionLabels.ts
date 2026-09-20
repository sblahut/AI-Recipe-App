/** Primary action on Shopping tab when a list is selected. */
export const SHOPPING_OPEN_LIST_LABEL = "Open list";

/** Move shopping list lines into Ingredients (inventory bulk). */
export const SHOPPING_STOCK_FROM_LIST_LABEL = "To ingredients";

/** Recipe card action to add missing lines to a shopping list. */
export const RECIPE_SHOPPING_LIST_BUTTON_LABEL = "Shopping list";

export function shareShoppingListAccessibilityLabel(listName: string): string {
  return `Share shopping list ${listName}`;
}

export function shareRecipeAccessibilityLabel(recipeTitle: string): string {
  return `Share recipe ${recipeTitle}`;
}
