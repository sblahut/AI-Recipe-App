import { Alert } from "react-native";

import { apiFetch, apiJson } from "@/lib/api";
import {
  MEAL_SLOT_LABELS,
  MEAL_SLOTS,
  type MealSlot,
  addDays,
  formatPlanDate,
  mondayOnOrBefore,
} from "@/lib/mealPlanWeek";
import { findFavoriteMatch } from "@/lib/recipeFavorites";
import type { GeneratedRecipe, SavedRecipe } from "@/lib/schemas";
import { savedRecipeReadSchema } from "@/lib/schemas";

async function ensureSavedFavorite(
  recipe: GeneratedRecipe,
  favorites: SavedRecipe[],
  serverUrl: string,
): Promise<number> {
  const existing = findFavoriteMatch(favorites, recipe);
  if (existing) {
    return existing.id;
  }

  const raw = await apiJson<unknown>("/recipes/saved", {
    baseUrl: serverUrl,
    method: "POST",
    body: JSON.stringify({ recipe, favorite: true }),
  });
  const saved = savedRecipeReadSchema.parse(raw);
  return saved.id;
}

function pickPlanDate(savedRecipeId: number, mealSlot: MealSlot, serverUrl: string): void {
  const weekStart = mondayOnOrBefore(new Date());
  const dayOptions = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(weekStart, index);
    return {
      date: formatPlanDate(day),
      label: day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
    };
  });

  Alert.alert(`Plan · ${MEAL_SLOT_LABELS[mealSlot]}`, "Pick a day this week", [
    ...dayOptions.map((option) => ({
      text: option.label,
      onPress: () => {
        void (async () => {
          try {
            await apiFetch("/meal-plan", {
              baseUrl: serverUrl,
              method: "POST",
              body: JSON.stringify({
                plan_date: option.date,
                meal_slot: mealSlot,
                saved_recipe_id: savedRecipeId,
              }),
            });
            Alert.alert("Added to plan", `${option.label} · ${MEAL_SLOT_LABELS[mealSlot]}`);
          } catch (e) {
            Alert.alert("Meal plan", e instanceof Error ? e.message : "Could not add to plan");
          }
        })();
      },
    })),
    { text: "Cancel", style: "cancel" },
  ]);
}

/** Saves as favorite if needed, then schedule on the meal plan. */
export async function promptAddRecipeToMealPlan(
  recipe: GeneratedRecipe,
  serverUrl: string,
  favorites: SavedRecipe[],
): Promise<void> {
  try {
    const savedRecipeId = await ensureSavedFavorite(recipe, favorites, serverUrl);
    Alert.alert("Add to meal plan", recipe.title, [
      ...MEAL_SLOTS.map((slot) => ({
        text: MEAL_SLOT_LABELS[slot],
        onPress: () => pickPlanDate(savedRecipeId, slot, serverUrl),
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  } catch (e) {
    Alert.alert("Meal plan", e instanceof Error ? e.message : "Could not save recipe");
  }
}
