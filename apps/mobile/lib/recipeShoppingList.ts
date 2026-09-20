import { Alert } from "react-native";

import { apiJson } from "@/lib/api";
import { shoppingListResultMessage } from "@/lib/recipeShoppingListMessages";
import { shoppingFromRecipeResponseSchema, type GeneratedRecipe, type ShoppingList } from "@/lib/schemas";

export function promptAddRecipeToShoppingList(
  recipe: GeneratedRecipe,
  lists: ShoppingList[],
  serverUrl: string,
): void {
  if (lists.length === 0) {
    Alert.alert("No shopping lists", "Create a list on the Shopping tab first.");
    return;
  }

  Alert.alert("Add to shopping list", recipe.title, [
    ...lists.map((list) => ({
      text: list.name,
      onPress: () => {
        void (async () => {
          try {
            const raw = await apiJson<unknown>("/shopping/from-recipe", {
              baseUrl: serverUrl,
              method: "POST",
              body: JSON.stringify({ list_id: list.id, recipe }),
            });
            const result = shoppingFromRecipeResponseSchema.parse(raw);
            const { title, message } = shoppingListResultMessage(
              list.name,
              result.added.length,
              result.skipped_in_pantry.length,
            );
            Alert.alert(title, message);
          } catch (e) {
            Alert.alert(
              "Shopping list",
              e instanceof Error ? e.message : "Could not update shopping list",
            );
          }
        })();
      },
    })),
    { text: "Cancel", style: "cancel" },
  ]);
}
