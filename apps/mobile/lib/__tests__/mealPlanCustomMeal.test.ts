import { saveCustomMealRecipeTitle } from "@/lib/mealPlanCustomMeal";
import { apiJson } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  apiJson: jest.fn(),
}));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

describe("saveCustomMealRecipeTitle", () => {
  beforeEach(() => {
    mockedApiJson.mockReset();
  });

  it("rejects empty titles before calling the API", async () => {
    await expect(saveCustomMealRecipeTitle("   ", "http://127.0.0.1:8000")).rejects.toThrow(
      "Enter a meal name",
    );
    expect(mockedApiJson).not.toHaveBeenCalled();
  });

  it("rejects titles over 200 characters", async () => {
    await expect(saveCustomMealRecipeTitle("x".repeat(201), "http://127.0.0.1:8000")).rejects.toThrow(
      "Meal name is too long",
    );
    expect(mockedApiJson).not.toHaveBeenCalled();
  });

  it("posts a minimal saved recipe and returns the id", async () => {
    mockedApiJson.mockResolvedValue({
      id: 42,
      title: "Tacos",
      recipe: { title: "Tacos", ingredients: [], steps: [] },
      favorite: false,
      created_at: "2026-01-01T00:00:00Z",
    });

    const id = await saveCustomMealRecipeTitle("  Tacos  ", "http://192.168.1.10:8000");

    expect(id).toBe(42);
    expect(mockedApiJson).toHaveBeenCalledWith("/recipes/saved", {
      baseUrl: "http://192.168.1.10:8000",
      method: "POST",
      body: JSON.stringify({
        recipe: {
          title: "Tacos",
          ingredients: [],
          steps: [],
        },
        favorite: false,
      }),
    });
  });
});
