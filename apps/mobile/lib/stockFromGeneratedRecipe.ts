import { Alert } from "react-native";

import { apiFetch } from "@/lib/api";
import { formatStockRecipeAlertMessage } from "@/lib/formatStockRecipeAlert";
import { pickStorageLocation } from "@/lib/pickStorageLocation";
import { recipeToIngredientCreates } from "@/lib/recipeIngredients";
import type { GeneratedRecipe } from "@/lib/schemas";
import { openIngredientScan } from "@/lib/startIngredientScan";

export async function stockFromGeneratedRecipe(
  recipe: GeneratedRecipe,
  serverUrl: string,
): Promise<void> {
  const location = await pickStorageLocation("Add to ingredients");
  if (!location) {
    return;
  }

  const items = recipeToIngredientCreates(recipe, location);
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
              openIngredientScan({ location, continuous: true });
            },
          },
        ]
      : []),
    { text: "OK", style: "cancel" as const },
  ]);
}
