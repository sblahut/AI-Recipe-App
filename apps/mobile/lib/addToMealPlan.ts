import { Alert } from "react-native";

import { apiFetch, apiJson } from "@/lib/api";
import {
  MEAL_SLOT_LABELS,
  MEAL_SLOTS,
  type MealSlot,
  addDays,
  formatPlanDate,
  formatWeekRangeLabel,
  weekStartOnOrBefore,
} from "@/lib/mealPlanWeek";
import type { WeekStartsOnDay } from "@/lib/userPreferences";
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

function pickPlanDate(
  savedRecipeId: number,
  mealSlot: MealSlot,
  serverUrl: string,
  weekStartMonday: Date,
): void {
  const weekLabel = formatWeekRangeLabel(weekStartMonday);
  const dayButtons = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(weekStartMonday, index);
    const planDate = formatPlanDate(day);
    const label = day.toLocaleDateString(undefined, { weekday: "short", month: "numeric", day: "numeric" });
    return {
      text: label,
      onPress: () => {
        void (async () => {
          try {
            await apiFetch("/meal-plan", {
              baseUrl: serverUrl,
              method: "POST",
              body: JSON.stringify({
                plan_date: planDate,
                meal_slot: mealSlot,
                saved_recipe_id: savedRecipeId,
              }),
            });
            Alert.alert("Added to plan", `${label} · ${MEAL_SLOT_LABELS[mealSlot]}`);
          } catch (e) {
            Alert.alert("Meal plan", e instanceof Error ? e.message : "Could not add to plan");
          }
        })();
      },
    };
  });

  Alert.alert(`${MEAL_SLOT_LABELS[mealSlot]} · ${weekLabel}`, "Choose a day (change week below)", [
    {
      text: "← Previous week",
      onPress: () => pickPlanDate(savedRecipeId, mealSlot, serverUrl, addDays(weekStartMonday, -7)),
    },
    ...dayButtons,
    {
      text: "Next week →",
      onPress: () => pickPlanDate(savedRecipeId, mealSlot, serverUrl, addDays(weekStartMonday, 7)),
    },
    { text: "Cancel", style: "cancel" },
  ]);
}

/** Saves as favorite if needed, then schedule on the meal plan. */
export async function promptAddRecipeToMealPlan(
  recipe: GeneratedRecipe,
  serverUrl: string,
  favorites: SavedRecipe[],
  weekStartsOnDay: WeekStartsOnDay = 1,
): Promise<void> {
  try {
    const savedRecipeId = await ensureSavedFavorite(recipe, favorites, serverUrl);
    const weekStart = weekStartOnOrBefore(new Date(), weekStartsOnDay);
    Alert.alert("Add to meal plan", recipe.title, [
      ...MEAL_SLOTS.map((slot) => ({
        text: MEAL_SLOT_LABELS[slot],
        onPress: () => pickPlanDate(savedRecipeId, slot, serverUrl, weekStart),
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  } catch (e) {
    Alert.alert("Meal plan", e instanceof Error ? e.message : "Could not save recipe");
  }
}
