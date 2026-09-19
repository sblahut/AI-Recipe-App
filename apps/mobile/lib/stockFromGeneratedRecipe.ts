import { Alert } from "react-native";

import { apiFetch } from "@/lib/api";
import { pickStorageLocation } from "@/lib/pickStorageLocation";
import { recipeToIngredientCreates } from "@/lib/recipeIngredients";
import type { GeneratedRecipe } from "@/lib/schemas";
import { openIngredientScan } from "@/lib/startIngredientScan";

export async function stockFromGeneratedRecipe(
  recipe: GeneratedRecipe,
  serverUrl: string,
): Promise<void> {
  const location = await pickStorageLocation("Stock from recipe");
  if (!location) {
    return;
  }

  const items = recipeToIngredientCreates(recipe, location);
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
          openIngredientScan({ location, continuous: true });
        },
      },
      { text: "Done", style: "cancel" },
    ],
  );
}
