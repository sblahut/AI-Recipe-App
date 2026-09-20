export type MealPlanShopResult = {
  addedCount: number;
  skippedPantryCount: number;
  missingEntryCount: number;
  mealsProcessed: number;
};

export function mealPlanShopAlertTitle(result: MealPlanShopResult): string {
  if (result.mealsProcessed === 0) {
    return "No planned meals";
  }
  if (result.addedCount > 0) {
    return "Shopping list updated";
  }
  if (result.skippedPantryCount > 0) {
    return "Already in pantry";
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
    if (result.skippedPantryCount > 0) {
      msg += ` ${result.skippedPantryCount} ingredient line${result.skippedPantryCount === 1 ? "" : "s"} already covered by your pantry.`;
    }
    if (result.missingEntryCount > 0) {
      msg += ` ${result.missingEntryCount} plan row(s) had missing saved recipes.`;
    }
    return msg;
  }

  if (result.skippedPantryCount > 0) {
    return (
      `For ${mealPhrase}, everything needed is already in your ingredients list — nothing new was added to "${listName}". ` +
      "Turn off pantry matching is not available; remove pantry items or edit the list manually if you still want to shop them."
    );
  }

  if (result.missingEntryCount > 0) {
    return `${result.missingEntryCount} planned meal(s) point to deleted recipes. Re-add them on the Plan tab.`;
  }

  return `No shoppable ingredient lines were found for ${mealPhrase}.`;
}
