import { apiJson } from "@/lib/api";
import { savedRecipeReadSchema } from "@/lib/schemas";

/** Saves a title-only recipe for meal-plan display (not favorited). */
export async function saveCustomMealRecipeTitle(
  title: string,
  serverUrl: string,
): Promise<number> {
  const trimmed = title.trim();
  if (trimmed.length < 1) {
    throw new Error("Enter a meal name");
  }
  if (trimmed.length > 200) {
    throw new Error("Meal name is too long");
  }

  const raw = await apiJson<unknown>("/recipes/saved", {
    baseUrl: serverUrl,
    method: "POST",
    body: JSON.stringify({
      recipe: {
        title: trimmed,
        ingredients: [],
        steps: [],
      },
      favorite: false,
    }),
  });
  const saved = savedRecipeReadSchema.parse(raw);
  return saved.id;
}
