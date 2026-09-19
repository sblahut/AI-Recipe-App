import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { radius, spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { apiFetch, apiJson } from "@/lib/api";
import { stockFromShoppingList } from "@/lib/stockFromShoppingList";
import {
  shoppingListDetailSchema,
  shoppingListSchema,
  type ShoppingList,
  type ShoppingListDetail,
  type ShoppingListItem,
} from "@/lib/schemas";

export default function ShoppingScreen() {
  const { colors } = useAppTheme();
  const { serverUrl } = useServerSettings();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ShoppingListDetail | null>(null);
  const [newListName, setNewListName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [loading, setLoading] = useState(true);

  const loadLists = useCallback(async () => {
    const raw = await apiJson<unknown>("/shopping/lists", { baseUrl: serverUrl });
    setLists(z.array(shoppingListSchema).parse(raw));
  }, [serverUrl]);

  const loadDetail = useCallback(
    async (id: number) => {
      const raw = await apiJson<unknown>(`/shopping/lists/${id}`, { baseUrl: serverUrl });
      setDetail(shoppingListDetailSchema.parse(raw));
    },
    [serverUrl],
  );

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        try {
          await loadLists();
        } finally {
          setLoading(false);
        }
      })();
    });
  }, [loadLists]);

  const selectList = (id: number) => {
    setSelectedId(id);
    void loadDetail(id);
  };

  const createList = async () => {
    const name = newListName.trim();
    if (!name) return;
    try {
      await apiFetch("/shopping/lists", {
        baseUrl: serverUrl,
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setNewListName("");
      await loadLists();
    } catch (e) {
      Alert.alert("Could not create list", e instanceof Error ? e.message : "Unknown error");
    }
  };

  const deleteList = (list: ShoppingList) => {
    Alert.alert("Delete list", `Remove "${list.name}" and all its items?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await apiFetch(`/shopping/lists/${list.id}`, { baseUrl: serverUrl, method: "DELETE" });
              if (selectedId === list.id) {
                setSelectedId(null);
                setDetail(null);
              }
              await loadLists();
            } catch (e) {
              Alert.alert("Delete failed", e instanceof Error ? e.message : "Unknown error");
            }
          })();
        },
      },
    ]);
  };

  const addItem = async () => {
    if (selectedId == null) return;
    const name = newItemName.trim();
    if (!name) return;
    await apiFetch(`/shopping/lists/${selectedId}/items`, {
      baseUrl: serverUrl,
      method: "POST",
      body: JSON.stringify({ name, quantity_kind: "count", quantity: 1, unit: "each" }),
    });
    setNewItemName("");
    await loadDetail(selectedId);
  };

  const toggleItem = async (itemId: number, checked: boolean) => {
    if (selectedId == null) return;
    await apiFetch(
      `/shopping/lists/${selectedId}/items/${itemId}?checked=${checked ? "false" : "true"}`,
      { baseUrl: serverUrl, method: "PATCH" },
    );
    await loadDetail(selectedId);
  };

  const deleteItem = (item: ShoppingListItem) => {
    if (selectedId == null) return;
    Alert.alert("Remove item", `Remove ${item.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await apiFetch(`/shopping/lists/${selectedId}/items/${item.id}`, {
                baseUrl: serverUrl,
                method: "DELETE",
              });
              await loadDetail(selectedId);
            } catch (e) {
              Alert.alert("Remove failed", e instanceof Error ? e.message : "Unknown error");
            }
          })();
        },
      },
    ]);
  };

  const selectedList = lists.find((list) => list.id === selectedId);

  if (loading) {
    return <Screen loading />;
  }

  return (
    <Screen padded={false}>
      <View style={styles.sectionPad}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <AppTextField
              placeholder="New list name"
              value={newListName}
              onChangeText={setNewListName}
              onSubmitEditing={() => void createList()}
            />
          </View>
          <AppButton label="Add" compact onPress={() => void createList()} />
        </View>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={lists}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listChips}
        renderItem={({ item }) => {
          const active = selectedId === item.id;
          return (
            <Pressable
              onPress={() => selectList(item.id)}
              onLongPress={() => deleteList(item)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active ? colors.primaryMuted : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? colors.primary : colors.textSecondary },
                ]}
              >
                {item.name}
              </Text>
            </Pressable>
          );
        }}
      />

      {selectedId != null ? (
        <>
          <View style={[styles.sectionPad, styles.listHeader]}>
            <Text style={[styles.listTitle, { color: colors.text }]}>{selectedList?.name}</Text>
            {selectedList ? (
              <Pressable onPress={() => deleteList(selectedList)} hitSlop={8}>
                <Text style={[styles.deleteList, { color: colors.danger }]}>Delete list</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={[styles.sectionPad, styles.row, styles.itemToolbar]}>
            <View style={styles.flex}>
              <AppTextField
                placeholder="Add item"
                value={newItemName}
                onChangeText={setNewItemName}
                onSubmitEditing={() => void addItem()}
              />
            </View>
            <AppButton label="Add" compact onPress={() => void addItem()} />
            <AppButton
              label="Scan"
              variant="accent"
              compact
              onPress={() =>
                router.push({
                  pathname: "/scan",
                  params: { target: "shopping_list", listId: String(selectedId) },
                })
              }
            />
          </View>

          <View style={styles.sectionPad}>
            <AppButton
              label="Stock list into ingredients"
              onPress={() => void stockFromShoppingList(selectedId, serverUrl)}
            />
          </View>

          <FlatList
            data={detail?.items ?? []}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.itemsList}
            ListEmptyComponent={
              <EmptyState title="Nothing on this list yet" subtitle="Add items or scan barcodes." />
            }
            renderItem={({ item }) => (
              <Card style={styles.itemCard}>
                <Pressable
                  onPress={() => void toggleItem(item.id, item.checked)}
                  style={styles.checkRow}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: item.checked ? colors.primary : colors.border,
                        backgroundColor: item.checked ? colors.primary : colors.surface,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.itemText,
                      { color: colors.text },
                      item.checked && { color: colors.textMuted, textDecorationLine: "line-through" },
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Remove ${item.name}`}
                  onPress={() => deleteItem(item)}
                  hitSlop={8}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                >
                  <Ionicons name="close-circle-outline" size={22} color={colors.textMuted} />
                </Pressable>
              </Card>
            )}
          />
        </>
      ) : (
        <EmptyState title="Select or create a list" subtitle="Long-press a list chip to delete it." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionPad: { paddingHorizontal: spacing.lg },
  row: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-end" },
  flex: { flex: 1 },
  listChips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: { ...typography.caption, fontWeight: "600" },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
  },
  listTitle: typography.headline,
  deleteList: { ...typography.caption, fontWeight: "600" },
  itemToolbar: { marginBottom: spacing.sm },
  itemsList: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  itemCard: {
    marginBottom: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  checkRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
  },
  itemText: typography.body,
});
