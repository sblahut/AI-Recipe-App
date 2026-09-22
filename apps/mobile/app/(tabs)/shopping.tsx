import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { Chip } from "@/components/ui/Chip";
import { AppButton } from "@/components/ui/AppButton";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { AppTextField } from "@/components/ui/AppTextField";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { InfoHint } from "@/components/ui/InfoHint";
import { Screen } from "@/components/ui/Screen";
import { spacing, typography } from "@/constants/theme";
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
  SHOPPING_STOCK_FROM_LIST_HINT,
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
  const [expandedLists, setExpandedLists] = useState<Partial<Record<number, boolean>>>({});
  const [detailsById, setDetailsById] = useState<Partial<Record<number, ShoppingListDetail>>>({});
  const [activeListId, setActiveListId] = useState<number | null>(null);
  const [newListName, setNewListName] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [addItemSaving, setAddItemSaving] = useState(false);
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
      const parsed = shoppingListDetailSchema.parse(raw);
      setDetailsById((prev) => ({ ...prev, [id]: parsed }));
      return parsed;
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

  const isListExpanded = useCallback(
    (listId: number, index: number) => {
      if (listId in expandedLists) {
        return expandedLists[listId] ?? false;
      }
      return lists.length === 1 || index === 0;
    },
    [expandedLists, lists.length],
  );

  const toggleListSection = useCallback(
    (listId: number, index: number) => {
      const willExpand = !isListExpanded(listId, index);
      setExpandedLists((prev) => ({ ...prev, [listId]: willExpand }));
      if (willExpand) {
        void loadDetail(listId);
      }
    },
    [isListExpanded, loadDetail],
  );

  useEffect(() => {
    if (lists.length === 0) {
      return;
    }
    for (let index = 0; index < lists.length; index++) {
      const list = lists[index];
      if (!list) {
        continue;
      }
      const expanded = isListExpanded(list.id, index);
      if (expanded && detailsById[list.id] == null) {
        void loadDetail(list.id);
      }
    }
  }, [detailsById, isListExpanded, lists, loadDetail]);

  const openShoppingList = (listId: number) => {
    router.push({
      pathname: "/shopping-list/[listId]",
      params: { listId: String(listId) },
    });
  };

  const createList = async () => {
    const name = newListName.trim();
    if (!name) return;
    try {
      const raw = await apiJson<unknown>("/shopping/lists", {
        baseUrl: serverUrl,
        method: "POST",
        body: JSON.stringify({ name }),
      });
      const created = shoppingListSchema.parse(raw);
      setNewListName("");
      setAddingList(false);
      setExpandedLists((prev) => ({ ...prev, [created.id]: true }));
      await loadLists();
      void loadDetail(created.id);
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
              setExpandedLists((prev) => {
                const next = { ...prev };
                delete next[list.id];
                return next;
              });
              setDetailsById((prev) => {
                const next = { ...prev };
                delete next[list.id];
                return next;
              });
              if (activeListId === list.id) {
                setActiveListId(null);
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

  const addItem = async (nameOverride?: string) => {
    if (activeListId == null) return;
    const name = (nameOverride ?? newItemName).trim();
    if (!name) {
      Alert.alert("Name required", "Enter an item name.");
      return;
    }
    setAddItemSaving(true);
    try {
      await apiFetch(`/shopping/lists/${activeListId}/items`, {
        baseUrl: serverUrl,
        method: "POST",
        body: JSON.stringify({ name, quantity_kind: "count", quantity: 1, unit: "each" }),
      });
      setNewItemName("");
      setShowAddItemForm(false);
      await loadDetail(activeListId);
    } catch (e) {
      Alert.alert("Add failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setAddItemSaving(false);
    }
  };

  const cancelAddItem = () => {
    setNewItemName("");
    setShowAddItemForm(false);
  };

  const shareList = async (listId: number) => {
    let detail = detailsById[listId];
    if (!detail) {
      try {
        detail = await loadDetail(listId);
      } catch (e) {
        Alert.alert("Share failed", e instanceof Error ? e.message : "Could not load list");
        return;
      }
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

  const activeList = lists.find((list) => list.id === activeListId);

  if (loading) {
    return <Screen loading />;
  }

  if (showAddItemForm && activeListId != null) {
    const listName = activeList?.name ?? "Shopping list";
    return (
      <Screen scroll>
        <Text style={[styles.addItemHeading, { color: colors.text }]}>Add item</Text>
        <Text style={[styles.addItemHint, { color: colors.textMuted }]}>Adding to {listName}</Text>
        <AppTextField
          label="Item name"
          value={newItemName}
          onChangeText={setNewItemName}
          placeholder="Milk, eggs, bread…"
          autoFocus
          onSubmitEditing={() => void addItem()}
        />
        <View style={styles.addItemActions}>
          <AppButton label="Cancel" variant="ghost" onPress={cancelAddItem} />
          <AppButton
            label="Save"
            loading={addItemSaving}
            onPress={() => void addItem()}
            style={styles.addItemSaveBtn}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll padded={false}>
      {/* Lists filter section */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeadingRow}>
          <Text style={[styles.filterHeading, { color: colors.textMuted }]}>Your lists</Text>
          {!addingList ? (
            <AppButton
              label="+ New list"
              variant="ghost"
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
      </View>

      {lists.length === 0 && !addingList ? (
        <View style={styles.listSections}>
          <EmptyState
            icon="cart-outline"
            title="No lists yet"
            subtitle="Create a list to start shopping."
          />
        </View>
      ) : (
        <View style={styles.listSections}>
          {lists.map((list, index) => {
            const detail = detailsById[list.id];
            const itemCount = detail?.items.length;
            const title =
              itemCount != null ? `${list.name} (${itemCount})` : list.name;
            return (
              <CollapsibleSection
                key={list.id}
                title={title}
                leadingIcon="list-outline"
                expanded={isListExpanded(list.id, index)}
                onToggle={() => toggleListSection(list.id, index)}
                onHeaderLongPress={() => deleteList(list)}
              >
                <ListSectionActions
                  list={list}
                  colors={colors}
                  onAddItem={() => {
                    setActiveListId(list.id);
                    setShowAddItemForm(true);
                  }}
                  onOpenList={() => openShoppingList(list.id)}
                  onStockFromList={() => void stockFromShoppingList(list.id, serverUrl)}
                  onShare={() => void shareList(list.id)}
                  onDelete={() => deleteList(list)}
                />
              </CollapsibleSection>
            );
          })}
        </View>
      )}

      <View style={styles.sectionPad}>
        <Card>
          <Text style={[styles.dealTitle, { color: colors.text }]}>Weekly deals</Text>
          <Text style={[styles.dealHint, { color: colors.textMuted }]}>
            Pick a chain to open their weekly ad. Add stores in Settings for directions.
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
    </Screen>
  );
}

type ListSectionActionsProps = {
  list: ShoppingList;
  colors: ReturnType<typeof useAppTheme>["colors"];
  onAddItem: () => void;
  onOpenList: () => void;
  onStockFromList: () => void;
  onShare: () => void;
  onDelete: () => void;
};

function ListSectionActions({
  list,
  colors,
  onAddItem,
  onOpenList,
  onStockFromList,
  onShare,
  onDelete,
}: ListSectionActionsProps) {
  return (
    <View style={styles.sectionBody}>
      <View style={styles.actionRow}>
        <Pressable
          onPress={onAddItem}
          style={({ pressed }) => [
            styles.actionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="add-outline" size={22} color={colors.primary} />
          <Text style={[styles.actionLabel, { color: colors.text }]}>Add item</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/scan",
              params: { target: "shopping_list", listId: String(list.id) },
            })
          }
          style={({ pressed }) => [
            styles.actionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="barcode-outline" size={22} color={colors.accent} />
          <Text style={[styles.actionLabel, { color: colors.text }]}>Scan barcode</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={SHOPPING_OPEN_LIST_LABEL}
          onPress={onOpenList}
          style={({ pressed }) => [
            styles.actionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="checkbox-outline" size={22} color={colors.primary} />
          <Text style={[styles.actionLabel, { color: colors.text }]}>{SHOPPING_OPEN_LIST_LABEL}</Text>
        </Pressable>
        <View style={styles.actionCardWithHint}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={SHOPPING_STOCK_FROM_LIST_LABEL}
            onPress={onStockFromList}
            style={({ pressed }) => [
              styles.actionCard,
              styles.actionCardInWrap,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons name="nutrition-outline" size={22} color={colors.accent} />
            <Text style={[styles.actionLabel, { color: colors.text }]}>
              {SHOPPING_STOCK_FROM_LIST_LABEL}
            </Text>
          </Pressable>
          <InfoHint
            title={SHOPPING_STOCK_FROM_LIST_LABEL}
            message={SHOPPING_STOCK_FROM_LIST_HINT}
            accessibilityLabel={`About ${SHOPPING_STOCK_FROM_LIST_LABEL}`}
            style={styles.cardInfoHint}
            iconSize={16}
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shareShoppingListAccessibilityLabel(list.name)}
        onPress={onShare}
        style={({ pressed }) => [
          styles.actionCard,
          styles.actionCardFull,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Ionicons name="share-outline" size={22} color={colors.textSecondary} />
        <Text style={[styles.actionLabel, { color: colors.text }]}>Share list</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onDelete}
        style={({ pressed }) => [styles.deleteListPress, pressed && { opacity: 0.7 }]}
      >
        <Text style={[styles.deleteList, { color: colors.danger }]}>Delete this list</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionPad: { paddingHorizontal: spacing.xl },
  row: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-end" },
  flex: { flex: 1 },
  listSections: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  sectionBody: {
    gap: spacing.sm,
  },
  deleteListPress: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  deleteList: { ...typography.label },
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
  actionRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  actionCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionCardWithHint: {
    flex: 1,
    position: "relative",
  },
  actionCardInWrap: {
    flex: undefined,
    width: "100%",
  },
  cardInfoHint: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    zIndex: 2,
  },
  actionLabel: {
    ...typography.button,
  },
  addItemHeading: { ...typography.h1, marginBottom: spacing.xs },
  addItemHint: { ...typography.body, marginBottom: spacing.lg },
  addItemActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  addItemSaveBtn: { minWidth: 100 },
  actionCardFull: {
    width: "100%",
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: 2,
  },
  filterHeading: {
    ...typography.captionMedium,
    flex: 1,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
