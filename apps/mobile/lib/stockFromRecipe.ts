import { Alert } from "react-native";

import { apiFetch, apiJson } from "@/lib/api";
import { pickStorageLocation } from "@/lib/pickStorageLocation";
import { recipeToIngredientCreates } from "@/lib/recipeIngredients";
import { savedRecipeReadSchema } from "@/lib/schemas";
import { openIngredientScan } from "@/lib/startIngredientScan";

/** Add saved recipe lines to ingredients, then open barcode scan for packaged items. */
export async function stockFromSavedRecipe(
  savedRecipeId: number,
  serverUrl: string,
): Promise<void> {
  const location = await pickStorageLocation("Stock from recipe");
  if (!location) {
    return;
  }

  const raw = await apiJson<unknown>(`/recipes/saved/${savedRecipeId}`, { baseUrl: serverUrl });
  const saved = savedRecipeReadSchema.parse(raw);
  const items = recipeToIngredientCreates(saved.recipe, location);
  if (items.length > 0) {
    await apiFetch("/inventory/bulk", {
      baseUrl: serverUrl,
      method: "POST",
      body: JSON.stringify({ items }),
    });
  }

  Alert.alert(
    "Recipe stocked",
    `${items.length} ingredient lines added to ${location}. Scan barcodes for packaged items.`,
    [
      {
        text: "Scan barcodes",
        onPress: () => {
          openIngredientScan({ location, savedRecipeId });
        },
      },
      { text: "Done", style: "cancel" },
    ],
  );
}
