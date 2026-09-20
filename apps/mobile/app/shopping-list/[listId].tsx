import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { ShoppingListItemsView } from "@/components/ShoppingListItemsView";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";

const LIST_HEADER_OPTIONS = {
  headerBackTitle: "Shopping",
  headerBackButtonDisplayMode: "minimal",
} as const;

export default function ShoppingListDetailScreen() {
  const { listId: listIdParam } = useLocalSearchParams<{ listId: string }>();
  const listId = Number(listIdParam);
  const [title, setTitle] = useState("Shopping list");

  if (!Number.isFinite(listId) || listId <= 0) {
    return (
      <>
        <Stack.Screen options={{ title: "Shopping list", ...LIST_HEADER_OPTIONS }} />
        <Screen>
          <EmptyState title="List not found" subtitle="Go back and select a shopping list." />
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title, ...LIST_HEADER_OPTIONS }} />
      <Screen padded={false}>
        <ShoppingListItemsView listId={listId} onListNameLoaded={setTitle} />
      </Screen>
    </>
  );
}
