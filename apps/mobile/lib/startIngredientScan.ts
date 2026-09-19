import { router } from "expo-router";

import { pickStorageLocation } from "@/lib/pickStorageLocation";

type ScanParams = {
  location: string;
  savedRecipeId?: number;
  shoppingListId?: number;
};

export function openIngredientScan(params: ScanParams): void {
  router.push({
    pathname: "/scan",
    params: {
      target: "inventory",
      location: params.location,
      continuous: "1",
      ...(params.savedRecipeId != null
        ? { savedRecipeId: String(params.savedRecipeId) }
        : {}),
      ...(params.shoppingListId != null
        ? { shoppingListId: String(params.shoppingListId) }
        : {}),
    },
  });
}

export async function startIngredientScan(
  options: Omit<ScanParams, "location"> & { location?: string } = {},
): Promise<void> {
  const location = options.location ?? (await pickStorageLocation());
  if (!location) {
    return;
  }
  openIngredientScan({
    location,
    ...(options.savedRecipeId != null ? { savedRecipeId: options.savedRecipeId } : {}),
    ...(options.shoppingListId != null ? { shoppingListId: options.shoppingListId } : {}),
  });
}
