import { Alert } from "react-native";

import { apiFetch, apiJson } from "@/lib/api";
import { pickStorageLocation } from "@/lib/pickStorageLocation";
import { shoppingListDetailSchema } from "@/lib/schemas";
import { openIngredientScan } from "@/lib/startIngredientScan";
import { SHOPPING_STOCK_FROM_LIST_LABEL } from "@/lib/uiActionLabels";

/** Add shopping list lines to ingredients, then scan barcodes for packaged goods. */
export async function stockFromShoppingList(listId: number, serverUrl: string): Promise<void> {
  const location = await pickStorageLocation(SHOPPING_STOCK_FROM_LIST_LABEL);
  if (!location) {
    return;
  }

  const raw = await apiJson<unknown>(`/shopping/lists/${listId}`, { baseUrl: serverUrl });
  const detail = shoppingListDetailSchema.parse(raw);
  if (detail.items.length === 0) {
    Alert.alert("Empty list", "Add items to this shopping list first.");
    return;
  }

  const items = detail.items.map((line) => ({
    name: line.name,
    quantity_kind: line.quantity_kind,
    quantity: line.quantity,
    unit: line.unit,
    location,
    barcode: line.barcode,
  }));

  await apiFetch("/inventory/bulk", {
    baseUrl: serverUrl,
    method: "POST",
    body: JSON.stringify({ items }),
  });

  Alert.alert(
    "Cart added to ingredients",
    `${items.length} items added to ${location}. Scan barcodes for packaged products?`,
    [
      {
        text: "Scan barcodes",
        onPress: () => {
          openIngredientScan({ location, shoppingListId: listId, continuous: true });
        },
      },
      { text: "Done", style: "cancel" },
    ],
  );
}
