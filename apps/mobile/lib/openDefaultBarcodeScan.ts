import { Alert } from "react-native";
import { router } from "expo-router";

import { apiJson } from "@/lib/api";
import { resolveShoppingListForBarcodeScan } from "@/lib/shoppingListTarget";
import { shoppingListSchema, type ShoppingList } from "@/lib/schemas";
import { startIngredientScan } from "@/lib/startIngredientScan";
import type { UserPreferences } from "@/lib/userPreferences";
import { z } from "zod";

async function loadShoppingLists(serverUrl: string): Promise<ShoppingList[]> {
  const raw = await apiJson<unknown>("/shopping/lists", { baseUrl: serverUrl });
  return z.array(shoppingListSchema).parse(raw);
}

/** Opens pantry scan flow or shopping-list scan based on user preference. */
export async function openDefaultBarcodeScan(
  serverUrl: string,
  preferences: UserPreferences,
): Promise<void> {
  if ((preferences.barcodeScanDefault ?? "pantry") === "pantry") {
    await startIngredientScan();
    return;
  }

  try {
    const lists = await loadShoppingLists(serverUrl);
    const list = resolveShoppingListForBarcodeScan(lists, preferences);
    if (!list) {
      Alert.alert(
        "Shopping list",
        "Choose a default shopping list in Settings, or create a list on the Shop tab.",
      );
      return;
    }
    router.push({
      pathname: "/scan",
      params: { target: "shopping_list", listId: String(list.id) },
    });
  } catch (e) {
    Alert.alert("Shopping list", e instanceof Error ? e.message : "Could not load lists");
  }
}
