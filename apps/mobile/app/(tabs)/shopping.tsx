import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { Chip } from "@/components/ui/Chip";
import { StorageFilterOption } from "@/components/StorageFilterOption";
import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { radius, spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { apiFetch, apiJson } from "@/lib/api";
import { openAddressInMaps, openExternalUrl } from "@/lib/openMaps";
import { formatShoppingListShare, shareText } from "@/lib/shareContent";
import { stockFromShoppingList } from "@/lib/stockFromShoppingList";
import {
  SHOPPING_OPEN_LIST_LABEL,
  SHOPPING_STOCK_FROM_LIST_LABEL,
  shareShoppingListAccessibilityLabel,
} from "@/lib/uiActionLabels";
import {
  weeklyAdChainForStore,
  weeklyAdChainsForPicker,
  weeklyAdUrlForChain,
} from "@/lib/storeChains";
import type { StoreChain } from "@/lib/userPreferences";
import {
  shoppingListDetailSchema,
  shoppingListSchema,
  type ShoppingList,
  type ShoppingListDetail,
} from "@/lib/schemas";

export default function ShoppingScreen() {
  const { colors } = useAppTheme();
  const { serverUrl } = useServerSettings();
  const { preferences } = useUserPreferences();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ShoppingListDetail | null>(null);
  const [newListName, setNewListName] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [loading, setLoading] = useState(true);

  const weeklyAdChains = useMemo(
    () => weeklyAdChainsForPicker(preferences.stores),
    [preferences.stores],
  );

  const [weeklyAdChain, setWeeklyAdChain] = useState<StoreChain | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setWeeklyAdChain((current) => {
        if (current && weeklyAdChains.includes(current)) {
          return current;
        }
        return weeklyAdChains[0] ?? null;
      });
    });
  }, [weeklyAdChains]);

  const storesForWeeklyChain = useMemo(() => {
    if (!weeklyAdChain) {
      return [];
    }
    return preferences.stores.filter(
      (store) => weeklyAdChainForStore(store) === weeklyAdChain,
    );
  }, [preferences.stores, weeklyAdChain]);

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
    setNewItemName("");
  };

  const selectList = (id: number) => {
    if (selectedId === id) {
      deselectList();
      return;
    }
    setSelectedId(id);
    void loadDetail(id);
  };

  const openShoppingList = () => {
    if (selectedId == null) {
      return;
    }
    router.push({
      pathname: "/shopping-list/[listId]",
      params: { listId: String(selectedId) },
    });
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
      setAddingList(false);
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

  const shareList = async () => {
    if (!detail) {
      Alert.alert("Nothing to share", "Select a list first.");
      return;
    }
    await shareText(detail.name, formatShoppingListShare(detail));
  };

  const openWeeklyAd = () => {
    if (!weeklyAdChain) {
      return;
    }
    const url = weeklyAdUrlForChain(weeklyAdChain);
    if (!url) {
      Alert.alert("Weekly ad", `No weekly ad link for ${weeklyAdChain}.`);
      return;
    }
    void openExternalUrl(url).catch((e: unknown) => {
      Alert.alert("Weekly ad", e instanceof Error ? e.message : "Could not open weekly ad");
    });
  };

  const selectedList = lists.find((list) => list.id === selectedId);

  if (loading) {
    return <Screen loading />;
  }

  return (
    <Screen scroll padded={false}>
      <View style={styles.filterSection}>
        <View style={styles.filterHeadingRow}>
          <Text style={[styles.filterHeading, { color: colors.textMuted }]}>Your lists</Text>
          {!addingList ? (
            <AppButton
              label="+ New list"
              variant="secondary"
              compact
              onPress={() => setAddingList(true)}
            />
          ) : null}
        </View>
        {addingList ? (
          <View style={styles.newListForm}>
            <View style={styles.flex}>
              <AppTextField
                placeholder="List name"
                value={newListName}
                onChangeText={setNewListName}
                onSubmitEditing={() => void createList()}
                autoFocus
              />
            </View>
            <AppButton label="Save" compact onPress={() => void createList()} />
            <AppButton
              label="Cancel"
              variant="ghost"
              compact
              onPress={() => {
                setAddingList(false);
                setNewListName("");
              }}
            />
          </View>
        ) : null}
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
            <Text style={[styles.listTitle, { color: colors.text }]}>{selectedList?.name}</Text>
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
              label={SHOPPING_OPEN_LIST_LABEL}
              variant="primary"
              compact
              style={styles.actionBtn}
              onPress={openShoppingList}
            />
            <AppButton
              label={SHOPPING_STOCK_FROM_LIST_LABEL}
              variant="secondary"
              compact
              style={styles.actionBtn}
              onPress={() => void stockFromShoppingList(selectedId, serverUrl)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={shareShoppingListAccessibilityLabel(selectedList?.name ?? "list")}
              onPress={() => void shareList()}
              style={({ pressed }) => [
                styles.shareIconBtn,
                { backgroundColor: colors.overlay },
                pressed && { opacity: 0.88 },
              ]}
            >
              <Ionicons name="share-outline" size={22} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.sectionPad}>
            <Card>
              <Text style={[styles.dealTitle, { color: colors.text }]}>Weekly ad</Text>
              <Text style={[styles.dealHint, { color: colors.textMuted }]}>
                Pick a chain, then open its weekly ad. Add stores in Settings for directions links.
              </Text>
              <View style={styles.chainRow}>
                {weeklyAdChains.map((chain) => (
                  <Chip
                    key={chain}
                    label={chain}
                    selected={weeklyAdChain === chain}
                    capitalize={false}
                    onPress={() => setWeeklyAdChain(chain)}
                  />
                ))}
              </View>
              <AppButton
                label={weeklyAdChain ? `Open ${weeklyAdChain} weekly ad` : "Open weekly ad"}
                compact
                onPress={openWeeklyAd}
              />
              {storesForWeeklyChain.map((store) => (
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

          {selectedList ? (
            <View style={[styles.sectionPad, styles.deleteListSection]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => deleteList(selectedList)}
                style={({ pressed }) => [styles.deleteListPress, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.deleteList, { color: colors.danger }]}>Delete list</Text>
              </Pressable>
            </View>
          ) : null}
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

const styles = StyleSheet.create({
  sectionPad: { paddingHorizontal: spacing.lg },
  row: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-end" },
  flex: { flex: 1 },
  listHeader: {
    paddingBottom: spacing.sm,
  },
  listTitle: typography.headline,
  deleteListSection: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    alignItems: "center",
  },
  deleteListPress: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  deleteList: { ...typography.label, fontWeight: "600" },
  newListForm: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  itemToolbar: { marginBottom: spacing.sm },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
    alignItems: "stretch",
  },
  actionBtn: { flex: 1, minWidth: 0 },
  shareIconBtn: {
    minHeight: 40,
    minWidth: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  dealTitle: typography.headline,
  dealHint: { ...typography.caption, lineHeight: 18, marginTop: spacing.xs },
  chainRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  filterSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: 2,
  },
  filterHeading: {
    ...typography.caption,
    fontWeight: "600",
    flex: 1,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
});
