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

/** Single scan: confirm quantity, then return to Ingredients. */
export async function startIngredientScan(
  options: Omit<ScanParams, "location" | "continuous"> & { location?: string } = {},
): Promise<void> {
  const location = options.location ?? (await pickStorageLocation());
  if (!location) {
    return;
  }
  openIngredientScan({
    location,
    continuous: false,
    ...(options.savedRecipeId != null ? { savedRecipeId: options.savedRecipeId } : {}),
    ...(options.shoppingListId != null ? { shoppingListId: options.shoppingListId } : {}),
  });
}
