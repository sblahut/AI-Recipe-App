jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { buildRecipeAiConstraints } from "@/lib/recipeAiConstraints";
import { DEFAULT_USER_PREFERENCES } from "@/lib/userPreferences";

describe("buildRecipeAiConstraints", () => {
  it("returns undefined when no rules apply", () => {
    expect(buildRecipeAiConstraints(DEFAULT_USER_PREFERENCES)).toBeUndefined();
  });

  it("combines diet flags and custom text", () => {
    const result = buildRecipeAiConstraints({
      ...DEFAULT_USER_PREFERENCES,
      dietGlutenFree: true,
      avoidIngredients: ["shellfish"],
      defaultConstraintText: "Air fryer OK",
      householdSize: 6,
    });
    expect(result).toContain("Gluten-free");
    expect(result).toContain("shellfish");
    expect(result).toContain("Air fryer OK");
    expect(result).toContain("6 servings");
  });
});
