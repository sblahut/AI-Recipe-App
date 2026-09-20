/** Open checklist view while shopping (Shop tab). */
export const SHOPPING_OPEN_LIST_LABEL = "Shop this list";

/** Move purchased list lines into Pantry inventory. */
export const SHOPPING_STOCK_FROM_LIST_LABEL = "Add to pantry";

/** Recipe card: add recipe lines to a shopping list. */
export const RECIPE_SHOPPING_LIST_BUTTON_LABEL = "+ Shopping list";

/** Recipe card: schedule recipe on the meal plan. */
export const RECIPE_MEAL_PLAN_BUTTON_LABEL = "+ Meal plan";

/** Recipes tab: generate from home inventory via Ollama. */
export const GENERATE_RECIPE_FROM_INGREDIENTS_LABEL = "Generate Recipe from Ingredients";

export function shareShoppingListAccessibilityLabel(listName: string): string {
  return `Share shopping list ${listName}`;
}

export function shareRecipeAccessibilityLabel(recipeTitle: string): string {
  return `Share recipe ${recipeTitle}`;
}
