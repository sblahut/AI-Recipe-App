import {
  mealPlanShopAlertMessage,
  mealPlanShopAlertTitle,
  mealPlanShopResultFromApi,
} from "@/lib/shoppingFromMealPlanAlert";

describe("shoppingFromMealPlanAlert", () => {
  it("maps API payload", () => {
    expect(
      mealPlanShopResultFromApi({
        added: [{ id: 1 }],
        skipped_in_pantry: ["a", "b"],
        missing_entry_ids: [],
        meals_processed: 2,
      }).skippedInIngredientsCount,
    ).toBe(2);
  });

  it("title when already stocked", () => {
    expect(
      mealPlanShopAlertTitle({
        addedCount: 0,
        skippedInIngredientsCount: 4,
        missingEntryCount: 0,
        mealsProcessed: 2,
      }),
    ).toBe("Already stocked");
  });

  it("message avoids pantry wording", () => {
    const msg = mealPlanShopAlertMessage(
      {
        addedCount: 0,
        skippedInIngredientsCount: 3,
        missingEntryCount: 0,
        mealsProcessed: 2,
      },
      "Wegmans",
    );
    expect(msg.toLowerCase()).not.toContain("pantry");
    expect(msg).toContain("ingredients list");
  });
});
