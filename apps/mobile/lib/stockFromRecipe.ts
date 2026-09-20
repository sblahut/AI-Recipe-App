import { Alert } from "react-native";

import { apiFetch, apiJson } from "@/lib/api";
import { formatStockRecipeAlertMessage } from "@/lib/formatStockRecipeAlert";
import { pickStorageLocation } from "@/lib/pickStorageLocation";
import { recipeToIngredientCreates } from "@/lib/recipeIngredients";
import { savedRecipeReadSchema } from "@/lib/schemas";
import { openIngredientScan } from "@/lib/startIngredientScan";

/** Add saved recipe lines to ingredients, then optionally scan barcodes. */
export async function stockFromSavedRecipe(
  savedRecipeId: number,
  serverUrl: string,
): Promise<void> {
  const location = await pickStorageLocation("Storage for new ingredients");
  if (!location) {
    return;
  }

  let saved;
  try {
    const raw = await apiJson<unknown>(`/recipes/saved/${savedRecipeId}`, { baseUrl: serverUrl });
    saved = savedRecipeReadSchema.parse(raw);
  } catch (e) {
    Alert.alert("Add failed", e instanceof Error ? e.message : "Could not load recipe");
    return;
  }

  const items = recipeToIngredientCreates(saved.recipe, location);
  try {
    if (items.length > 0) {
      await apiFetch("/inventory/bulk", {
        baseUrl: serverUrl,
        method: "POST",
        body: JSON.stringify({ items }),
      });
    }
  } catch (e) {
    Alert.alert("Add failed", e instanceof Error ? e.message : "Could not save to ingredients");
    return;
  }

  Alert.alert("Ingredients", formatStockRecipeAlertMessage(items.length, location), [
    ...(items.length > 0
      ? [
          {
            text: "Scan barcodes",
            onPress: () => {
              openIngredientScan({ location, savedRecipeId, continuous: true });
            },
          },
        ]
      : []),
    { text: "OK", style: "cancel" as const },
  ]);
}
