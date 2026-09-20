import { Alert } from "react-native";
import { router } from "expo-router";

import { pickStorageLocation } from "@/lib/pickStorageLocation";

type ScanParams = {
  location: string;
  savedRecipeId?: number;
  shoppingListId?: number;
  /** When true, keep scanning after each add (stocking from recipe/list). */
  continuous?: boolean;
};

export function openIngredientScan(params: ScanParams): void {
  router.push({
    pathname: "/scan",
    params: {
      target: "inventory",
      location: params.location,
      ...(params.continuous ? { continuous: "1" } : {}),
      ...(params.savedRecipeId != null
        ? { savedRecipeId: String(params.savedRecipeId) }
        : {}),
      ...(params.shoppingListId != null
        ? { shoppingListId: String(params.shoppingListId) }
        : {}),
    },
  });
}

/** Pick storage, then scan barcodes or open manual add on Ingredients. */
export async function startIngredientScan(
  options: Omit<ScanParams, "location" | "continuous"> & { location?: string } = {},
): Promise<void> {
  const location = options.location ?? (await pickStorageLocation("Add to ingredients"));
  if (!location) {
    return;
  }

  Alert.alert(
    location,
    "Scan UPC barcodes, or add an item manually without a barcode.",
    [
      {
        text: "Scan barcodes",
        onPress: () => {
          openIngredientScan({
            location,
            continuous: false,
            ...(options.savedRecipeId != null ? { savedRecipeId: options.savedRecipeId } : {}),
            ...(options.shoppingListId != null ? { shoppingListId: options.shoppingListId } : {}),
          });
        },
      },
      {
        text: "Add manually",
        onPress: () => {
          router.push({
            pathname: "/(tabs)",
            params: { manualAdd: "1", location },
          });
        },
      },
      { text: "Cancel", style: "cancel" },
    ],
  );
}
