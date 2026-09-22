import type { UserPreferences } from "@/lib/userPreferences";

/** Builds the constraints string sent to recipe generate / AI search. */
export function buildRecipeAiConstraints(preferences: UserPreferences): string | undefined {
  const parts: string[] = [];

  if (preferences.dietVegetarian) {
    parts.push("Vegetarian (no meat or fish).");
  }
  if (preferences.dietVegan) {
    parts.push("Vegan (no animal products).");
  }
  if (preferences.dietGlutenFree) {
    parts.push("Gluten-free.");
  }

  for (const item of preferences.avoidIngredients) {
    const trimmed = item.trim();
    if (trimmed) {
      parts.push(`Do not use: ${trimmed}.`);
    }
  }

  if (preferences.preferQuickRecipes) {
    parts.push("Prefer recipes under 30 minutes prep time.");
  }
  if (preferences.preferKidFriendly) {
    parts.push("Kid-friendly, mild flavors, approachable for families.");
  }

  const servings = preferences.householdSize ?? 4;
  if (servings > 0 && servings !== 4) {
    parts.push(`Scale recipes for about ${servings} servings when possible.`);
  }

  const custom = preferences.defaultConstraintText.trim();
  if (custom) {
    parts.push(custom);
  }

  if (parts.length === 0) {
    return undefined;
  }
  return parts.join(" ");
}
