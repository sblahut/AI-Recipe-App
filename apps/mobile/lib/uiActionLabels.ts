/** Open checklist view while shopping (Shop tab). */
export const SHOPPING_OPEN_LIST_LABEL = "Shop this list";

/** Move purchased list lines into Pantry inventory. */
export const SHOPPING_STOCK_FROM_LIST_LABEL = "Add to pantry";

/** Info hint for Shop tab “Add to pantry”. */
export const SHOPPING_STOCK_FROM_LIST_HINT =
  "Adds only items you marked in cart on this list to your Pantry—not “still to buy” lines. You choose storage (fridge, pantry, etc.). Packaged goods can be scanned afterward.";

/** Info hint for Plan tab “Shop for this week”. */
export const MEAL_PLAN_SHOP_WEEK_HINT =
  "Builds a shopping list from your planned meals for this week. Ingredients you already track in Pantry are skipped so you only shop for what is missing.";

/** Recipe card: add recipe lines to a shopping list. */
export const RECIPE_SHOPPING_LIST_BUTTON_LABEL = "+ Shopping list";

/** Recipe card: schedule recipe on the meal plan. */
export const RECIPE_MEAL_PLAN_BUTTON_LABEL = "+ Meal plan";

/** Recipes tab: unified generate action. */
export const GENERATE_RECIPES_LABEL = "Generate Recipes";

/** Info hint for Recipes tab “Search for a recipe idea” / generate section. */
export const RECIPE_GENERATE_SECTION_HINT =
  "Optional: describe what you want. Check pantry or Publix BOGOs to cook from those items (or both). With neither checked, generation uses your description like a recipe search.";

/** Recipe source toggles inside the idea / generate section. */
export const RECIPE_USE_PANTRY_INGREDIENTS_LABEL = "Use ingredients from pantry";
export const RECIPE_USE_PUBLIX_BOGO_LABEL = "Use ingredients from Publix BOGO list";

export function shareShoppingListAccessibilityLabel(listName: string): string {
  return `Share shopping list ${listName}`;
}

export function shareRecipeAccessibilityLabel(recipeTitle: string): string {
  return `Share recipe ${recipeTitle}`;
}
