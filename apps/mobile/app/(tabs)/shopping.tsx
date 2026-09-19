import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { StorageFilterOption } from "@/components/StorageFilterOption";
import { SwipeableRow } from "@/components/SwipeableRow";
import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { apiFetch, apiJson } from "@/lib/api";
import { openAddressInMaps, openExternalUrl } from "@/lib/openMaps";
import { formatShoppingListShare, shareText } from "@/lib/shareContent";
import { stockFromShoppingList } from "@/lib/stockFromShoppingList";
import { PUBLIX_WEEKLY_AD } from "@/lib/storeChains";
import {
  shoppingListDetailSchema,
  shoppingListSchema,
  type ShoppingList,
  type ShoppingListDetail,
  type ShoppingListItem,
} from "@/lib/schemas";

type ItemFilter = "All" | "To buy" | "In cart";

const ITEM_FILTERS: { id: ItemFilter; label: string; icon: "layers-outline" | "cart-outline" | "checkmark-circle-outline" }[] = [
  { id: "All", label: "All items", icon: "layers-outline" },
  { id: "To buy", label: "Still to buy", icon: "cart-outline" },
  { id: "In cart", label: "In cart", icon: "checkmark-circle-outline" },
];

export default function ShoppingScreen() {
  const { colors } = useAppTheme();
  const { serverUrl } = useServerSettings();
  const { preferences } = useUserPreferences();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ShoppingListDetail | null>(null);
  const [newListName, setNewListName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [itemFilter, setItemFilter] = useState<ItemFilter>("All");
  const [loading, setLoading] = useState(true);

  const publixStores = useMemo(
    () =>
      preferences.stores.filter(
        (store) => store.chain === "Publix" || /publix/i.test(store.name),
      ),
    [preferences.stores],
  );

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

  const deselectList = () => {
    setSelectedId(null);
    setDetail(null);
    setItemFilter("All");
    setNewItemName("");
  };

  const selectList = (id: number) => {
    if (selectedId === id) {
      deselectList();
      return;
    }
    setSelectedId(id);
    setItemFilter("All");
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
    try {
      await apiFetch(`/shopping/lists/${selectedId}/items`, {
        baseUrl: serverUrl,
        method: "POST",
        body: JSON.stringify({ name, quantity_kind: "count", quantity: 1, unit: "each" }),
      });
      setNewItemName("");
      await loadDetail(selectedId);
    } catch (e) {
      Alert.alert("Add failed", e instanceof Error ? e.message : "Unknown error");
    }
  };

  const setItemInCart = async (item: ShoppingListItem, inCart: boolean) => {
    if (selectedId == null || item.checked === inCart) return;
    try {
      await apiFetch(
        `/shopping/lists/${selectedId}/items/${item.id}?checked=${inCart ? "true" : "false"}`,
        { baseUrl: serverUrl, method: "PATCH" },
      );
      await loadDetail(selectedId);
    } catch (e) {
      Alert.alert("Update failed", e instanceof Error ? e.message : "Unknown error");
    }
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

  const shareList = async () => {
    if (!detail) {
      Alert.alert("Nothing to share", "Select a list first.");
      return;
    }
    await shareText(detail.name, formatShoppingListShare(detail));
  };

  const openPublixAd = () => {
    void openExternalUrl(PUBLIX_WEEKLY_AD).catch((e: unknown) => {
      Alert.alert("Could not open Publix", e instanceof Error ? e.message : "Unknown error");
    });
  };

  const selectedList = lists.find((list) => list.id === selectedId);
  const items = detail?.items ?? [];
  const filteredItems = items.filter((item) => {
    if (itemFilter === "To buy") return !item.checked;
    if (itemFilter === "In cart") return item.checked;
    return true;
  });
  const countByFilter = {
    All: items.length,
    "To buy": items.filter((item) => !item.checked).length,
    "In cart": items.filter((item) => item.checked).length,
  };

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

      <View style={styles.filterSection}>
        <Text style={[styles.filterHeading, { color: colors.textMuted }]}>Your lists</Text>
        {lists.map((list) => (
          <StorageFilterOption
            key={list.id}
            label={list.name}
            icon="list-outline"
            selected={selectedId === list.id}
            onPress={() => selectList(list.id)}
            onLongPress={() => deleteList(list)}
          />
        ))}
      </View>

      {selectedId != null ? (
        <>
          <View style={[styles.sectionPad, styles.listHeader]}>
            <View style={styles.flex}>
              <Text style={[styles.listTitle, { color: colors.text }]}>{selectedList?.name}</Text>
              <Pressable onPress={deselectList} hitSlop={8} accessibilityRole="button">
                <Text style={[styles.allListsLink, { color: colors.primary }]}>All lists</Text>
              </Pressable>
            </View>
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

          <View style={[styles.sectionPad, styles.actionsRow]}>
            <AppButton
              label="Share list"
              variant="secondary"
              compact
              style={styles.flex}
              onPress={() => void shareList()}
            />
            <AppButton
              label="Stock into ingredients"
              compact
              style={styles.flex}
              onPress={() => void stockFromShoppingList(selectedId, serverUrl)}
            />
          </View>

          <View style={styles.sectionPad}>
            <Card>
              <Text style={[styles.dealTitle, { color: colors.text }]}>Publix weekly BOGOs</Text>
              <AppButton label="Open Publix weekly ad" compact onPress={openPublixAd} />
              {publixStores.map((store) => (
                <AppButton
                  key={store.id}
                  label={store.address ? `Directions to ${store.name}` : store.name}
                  variant="secondary"
                  compact
                  onPress={() => {
                    void openAddressInMaps(store.address || store.name).catch((e: unknown) => {
                      Alert.alert("Maps", e instanceof Error ? e.message : "Could not open maps");
                    });
                  }}
                />
              ))}
            </Card>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterHeading, { color: colors.textMuted }]}>Browse items</Text>
            {ITEM_FILTERS.map((filter) => (
              <StorageFilterOption
                key={filter.id}
                label={filter.label}
                icon={filter.icon}
                selected={itemFilter === filter.id}
                count={countByFilter[filter.id]}
                onPress={() => setItemFilter(filter.id)}
              />
            ))}
          </View>

          <FlatList
            style={styles.flex}
            data={filteredItems}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={filteredItems.length === 0 ? styles.listEmpty : styles.itemsList}
            ListEmptyComponent={
              <EmptyState
                title={itemFilter === "All" ? "Nothing on this list yet" : "Nothing in this filter"}
                subtitle="Add items, scan barcodes, or pick another filter."
              />
            }
            renderItem={({ item }) => (
              <SwipeableRow onDelete={() => deleteItem(item)} label="Remove">
                <Card style={styles.rowCard}>
                  <View style={styles.rowMain}>
                    <Text
                      style={[
                        styles.name,
                        { color: colors.text },
                        item.checked && { color: colors.textMuted, textDecorationLine: "line-through" },
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]}>
                      {formatShoppingQty(item)} · {item.checked ? "In cart" : "Still to buy"}
                    </Text>
                  </View>
                  <AppButton
                    label={item.checked ? "Still to buy" : "Add to cart"}
                    variant={item.checked ? "secondary" : "accent"}
                    compact
                    onPress={() => void setItemInCart(item, !item.checked)}
                  />
                  {Platform.OS === "web" ? (
                    <Pressable
                      accessibilityLabel={`Remove ${item.name}`}
                      onPress={() => deleteItem(item)}
                      hitSlop={8}
                      style={({ pressed }) => [styles.deleteIcon, { opacity: pressed ? 0.6 : 1 }]}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </Pressable>
                  ) : null}
                </Card>
              </SwipeableRow>
            )}
          />
        </>
      ) : (
        <EmptyState
          title="Select or create a list"
          subtitle="Tap a list again to close it. Long-press to delete."
        />
      )}
    </Screen>
  );
}

function formatShoppingQty(item: ShoppingListItem): string {
  if (item.quantity == null) return "No quantity set";
  return `${item.quantity} ${item.unit ?? ""}`.trim();
}

const styles = StyleSheet.create({
  sectionPad: { paddingHorizontal: spacing.lg },
  row: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-end" },
  flex: { flex: 1 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
  },
  listTitle: typography.headline,
  allListsLink: { ...typography.caption, fontWeight: "600", marginTop: spacing.xs },
  deleteList: { ...typography.caption, fontWeight: "600" },
  itemToolbar: { marginBottom: spacing.sm },
  actionsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  dealTitle: typography.headline,
  filterSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: 2,
  },
  filterHeading: {
    ...typography.caption,
    fontWeight: "600",
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  itemsList: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  listEmpty: { flexGrow: 1 },
  rowCard: {
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowMain: { flex: 1 },
  deleteIcon: { padding: spacing.sm },
  name: typography.headline,
  meta: { ...typography.caption, marginTop: 2 },
});
