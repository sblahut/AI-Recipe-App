import {
  mealPlanCookedAccessibilityLabel,
  mealPlanCookedPantryMessage,
  mealPlanCookedPantryTitle,
} from "@/lib/mealPlanCookedAlert";
import type { MealPlanCookResponse } from "@/lib/schemas";

const baseEntry = {
  id: 1,
  plan_date: "2026-04-07",
  meal_slot: "dinner" as const,
  saved_recipe_id: 2,
  recipe_title: "Soup",
  cooked: true,
  created_at: "2026-04-07T00:00:00Z",
};

function result(partial: Partial<MealPlanCookResponse>): MealPlanCookResponse {
  return {
    entry: baseEntry,
    removed: [],
    reduced: [],
    missing: [],
    skipped: [],
    no_ingredient_lines: false,
    ...partial,
  };
}

describe("mealPlanCookedAlert", () => {
  it("explains title-only meals", () => {
    const payload = result({ no_ingredient_lines: true });
    expect(mealPlanCookedPantryTitle(payload)).toBe("Marked cooked");
    expect(mealPlanCookedPantryMessage(payload)).toContain("no ingredient list");
  });

  it("summarizes pantry changes", () => {
    const payload = result({
      removed: ["onion"],
      reduced: ["carrots"],
      missing: ["chicken"],
      skipped: ["olive oil"],
    });
    expect(mealPlanCookedPantryTitle(payload)).toBe("Pantry updated");
    const message = mealPlanCookedPantryMessage(payload);
    expect(message).toContain("Removed onion");
    expect(message).toContain("carrots");
    expect(message).toContain("Not in Pantry: chicken");
    expect(message).toContain("olive oil");
  });

  it("builds checkbox accessibility labels", () => {
    expect(mealPlanCookedAccessibilityLabel("Soup", false)).toBe("Soup, not cooked");
    expect(mealPlanCookedAccessibilityLabel("Soup", true)).toBe("Soup, cooked");
  });
});
