import type { MealPlanCookResponse } from "@/lib/schemas";

export function mealPlanCookedPantryTitle(result: MealPlanCookResponse): string {
  if (result.no_ingredient_lines) {
    return "Marked cooked";
  }
  if (result.removed.length > 0 || result.reduced.length > 0) {
    return "Pantry updated";
  }
  return "Marked cooked";
}

export function mealPlanCookedPantryMessage(result: MealPlanCookResponse): string {
  if (result.no_ingredient_lines) {
    return "This meal has no ingredient list, so Pantry was left unchanged.";
  }

  const parts: string[] = [];
  if (result.removed.length > 0) {
    parts.push(`Removed ${result.removed.join(", ")}.`);
  }
  if (result.reduced.length > 0) {
    parts.push(`Used some of ${result.reduced.join(", ")}.`);
  }
  if (result.missing.length > 0) {
    parts.push(`Not in Pantry: ${result.missing.join(", ")}.`);
  }
  if (result.skipped.length > 0) {
    parts.push(`Left unchanged (no matching amount): ${result.skipped.join(", ")}.`);
  }
  if (parts.length === 0) {
    return "Nothing in Pantry matched this meal’s ingredients.";
  }
  return parts.join(" ");
}

export function mealPlanCookedAccessibilityLabel(title: string, cooked: boolean): string {
  return cooked ? `${title}, cooked` : `${title}, not cooked`;
}
