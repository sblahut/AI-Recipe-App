import { Alert } from "react-native";

import { apiJson } from "@/lib/api";
import { shoppingListResultMessage } from "@/lib/recipeShoppingListMessages";
import {
  resolveDefaultShoppingList,
  skipPantryCheckFromPreferences,
} from "@/lib/shoppingListTarget";
import { shoppingFromRecipeResponseSchema, type GeneratedRecipe, type ShoppingList } from "@/lib/schemas";
import type { UserPreferences } from "@/lib/userPreferences";

async function postRecipeToShoppingList(
  recipe: GeneratedRecipe,
  list: ShoppingList,
  serverUrl: string,
  preferences: Pick<UserPreferences, "omitPantryItemsFromShoppingLists">,
): Promise<void> {
  const raw = await apiJson<unknown>("/shopping/from-recipe", {
    baseUrl: serverUrl,
    method: "POST",
    body: JSON.stringify({
      list_id: list.id,
      recipe,
      skip_pantry_check: skipPantryCheckFromPreferences(preferences),
    }),
  });
  const result = shoppingFromRecipeResponseSchema.parse(raw);
  const { title, message } = shoppingListResultMessage(
    list.name,
    result.added.length,
    result.skipped_in_pantry.length,
  );
  Alert.alert(title, message);
}

export function promptAddRecipeToShoppingList(
  recipe: GeneratedRecipe,
  lists: ShoppingList[],
  serverUrl: string,
  preferences: UserPreferences,
  onListUsed?: (listId: number) => void,
): void {
  if (lists.length === 0) {
    Alert.alert("No shopping lists", "Create a list on the Shopping tab first.");
    return;
  }

  const defaultList = resolveDefaultShoppingList(lists, preferences);
  if (defaultList) {
    void (async () => {
      try {
        await postRecipeToShoppingList(recipe, defaultList, serverUrl, preferences);
        onListUsed?.(defaultList.id);
      } catch (e) {
        Alert.alert(
          "Shopping list",
          e instanceof Error ? e.message : "Could not update shopping list",
        );
      }
    })();
    return;
  }

  Alert.alert("Add to shopping list", recipe.title, [
    ...lists.map((list) => ({
      text: list.name,
      onPress: () => {
        void (async () => {
          try {
            await postRecipeToShoppingList(recipe, list, serverUrl, preferences);
            onListUsed?.(list.id);
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
