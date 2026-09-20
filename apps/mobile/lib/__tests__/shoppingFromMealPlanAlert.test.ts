import {
  mealPlanShopAlertMessage,
  mealPlanShopAlertTitle,
} from "@/lib/shoppingFromMealPlanAlert";

describe("shoppingFromMealPlanAlert", () => {
  it("title for all in pantry", () => {
    expect(
      mealPlanShopAlertTitle({
        addedCount: 0,
        skippedPantryCount: 4,
        missingEntryCount: 0,
        mealsProcessed: 2,
      }),
    ).toBe("Already in pantry");
  });

  it("message explains meal plan shopping", () => {
    const msg = mealPlanShopAlertMessage(
      {
        addedCount: 0,
        skippedPantryCount: 3,
        missingEntryCount: 0,
        mealsProcessed: 2,
      },
      "Wegmans",
    );
    expect(msg).toContain("2 planned meals");
    expect(msg).toContain("already in your ingredients");
  });
});
