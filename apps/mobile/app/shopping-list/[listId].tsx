import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { ShoppingListItemsView } from "@/components/ShoppingListItemsView";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";

export default function ShoppingListDetailScreen() {
  const { listId: listIdParam } = useLocalSearchParams<{ listId: string }>();
  const listId = Number(listIdParam);
  const [title, setTitle] = useState("Shopping list");

  if (!Number.isFinite(listId) || listId <= 0) {
    return (
      <>
        <Stack.Screen options={{ title: "Shopping list" }} />
        <Screen>
          <EmptyState title="List not found" subtitle="Go back and select a shopping list." />
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen padded={false}>
        <ShoppingListItemsView listId={listId} onListNameLoaded={setTitle} />
      </Screen>
    </>
  );
}
