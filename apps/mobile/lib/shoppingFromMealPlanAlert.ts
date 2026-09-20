export type MealPlanShopResult = {
  addedCount: number;
  skippedInIngredientsCount: number;
  missingEntryCount: number;
  mealsProcessed: number;
};

export function mealPlanShopResultFromApi(payload: {
  added: unknown[];
  skipped_in_pantry: string[];
  missing_entry_ids: number[];
  meals_processed: number;
}): MealPlanShopResult {
  return {
    addedCount: payload.added.length,
    skippedInIngredientsCount: payload.skipped_in_pantry.length,
    missingEntryCount: payload.missing_entry_ids.length,
    mealsProcessed: payload.meals_processed,
  };
}

export function mealPlanShopAlertTitle(result: MealPlanShopResult): string {
  if (result.mealsProcessed === 0) {
    return "No planned meals";
  }
  if (result.addedCount > 0) {
    return "Shopping list updated";
  }
  if (result.skippedInIngredientsCount > 0) {
    return "Already stocked";
  }
  return "Nothing to add";
}

export function mealPlanShopAlertMessage(result: MealPlanShopResult, listName: string): string {
  if (result.mealsProcessed === 0) {
    return "There are no meals on your plan for this week.";
  }

  const mealPhrase = `${result.mealsProcessed} planned meal${result.mealsProcessed === 1 ? "" : "s"}`;

  if (result.addedCount > 0) {
    let msg = `Added or updated ${result.addedCount} item${result.addedCount === 1 ? "" : "s"} on "${listName}" from ${mealPhrase}.`;
    if (result.skippedInIngredientsCount > 0) {
      msg += ` ${result.skippedInIngredientsCount} line${result.skippedInIngredientsCount === 1 ? "" : "s"} already on your ingredients list.`;
    }
    if (result.missingEntryCount > 0) {
      msg += ` ${result.missingEntryCount} plan row(s) had missing saved recipes.`;
    }
    return msg;
  }

  if (result.skippedInIngredientsCount > 0) {
    return (
      `For ${mealPhrase}, everything needed is already on your ingredients list — nothing new was added to "${listName}". ` +
      "Remove or edit items on the Ingredients tab if you still want them on this shopping list."
    );
  }

  if (result.missingEntryCount > 0) {
    return `${result.missingEntryCount} planned meal(s) point to deleted recipes. Re-add them on the Plan tab.`;
  }

  return `No shoppable ingredient lines were found for ${mealPhrase}.`;
}
