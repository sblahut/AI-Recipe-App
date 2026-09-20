import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { StorageFilterOption } from "@/components/StorageFilterOption";
import { SwipeableRow } from "@/components/SwipeableRow";
import { AppButton } from "@/components/ui/AppButton";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  SHOPPING_ITEM_FILTERS,
  type ShoppingItemFilter,
} from "@/constants/shoppingItemFilters";
import { spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { apiFetch, apiJson } from "@/lib/api";
import { formatShoppingQty } from "@/lib/formatShoppingQty";
import { shoppingListDetailSchema, type ShoppingListItem } from "@/lib/schemas";

type ShoppingListItemsViewProps = {
  listId: number;
  onListNameLoaded?: (name: string) => void;
};

export function ShoppingListItemsView({ listId, onListNameLoaded }: ShoppingListItemsViewProps) {
  const { colors } = useAppTheme();
  const { serverUrl } = useServerSettings();
  const [itemFilter, setItemFilter] = useState<ShoppingItemFilter>("All");
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDetail = useCallback(async () => {
    try {
      const raw = await apiJson<unknown>(`/shopping/lists/${listId}`, { baseUrl: serverUrl });
      const detail = shoppingListDetailSchema.parse(raw);
      setItems(detail.items);
      onListNameLoaded?.(detail.name);
    } catch (e) {
      Alert.alert("Could not load list", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [listId, onListNameLoaded, serverUrl]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadDetail();
    }, [loadDetail]),
  );

  const setItemInCart = async (item: ShoppingListItem, inCart: boolean) => {
    if (item.checked === inCart) {
      return;
    }
    try {
      await apiFetch(
        `/shopping/lists/${listId}/items/${item.id}?checked=${inCart ? "true" : "false"}`,
        { baseUrl: serverUrl, method: "PATCH" },
      );
      await loadDetail();
    } catch (e) {
      Alert.alert("Update failed", e instanceof Error ? e.message : "Unknown error");
    }
  };

  const deleteItem = (item: ShoppingListItem) => {
    Alert.alert("Remove item", `Remove ${item.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await apiFetch(`/shopping/lists/${listId}/items/${item.id}`, {
                baseUrl: serverUrl,
                method: "DELETE",
              });
              await loadDetail();
            } catch (e) {
              Alert.alert("Remove failed", e instanceof Error ? e.message : "Unknown error");
            }
          })();
        },
      },
    ]);
  };

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (itemFilter === "To buy") {
          return !item.checked;
        }
        if (itemFilter === "In cart") {
          return item.checked;
        }
        return true;
      }),
    [items, itemFilter],
  );

  const countByFilter = useMemo(
    () => ({
      All: items.length,
      "To buy": items.filter((item) => !item.checked).length,
      "In cart": items.filter((item) => item.checked).length,
    }),
    [items],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textMuted }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <View style={styles.filterSection}>
        {SHOPPING_ITEM_FILTERS.map((filter) => (
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
            subtitle="Add items from the Shopping tab, or pick another filter."
          />
        }
        renderItem={({ item }) => (
          <ItemRow colors={colors} item={item} onToggleCart={setItemInCart} onDelete={deleteItem} />
        )}
      />
    </View>
  );
}

function ItemRow({
  colors,
  item,
  onToggleCart,
  onDelete,
}: {
  colors: ReturnType<typeof useAppTheme>["colors"];
  item: ShoppingListItem;
  onToggleCart: (item: ShoppingListItem, inCart: boolean) => void;
  onDelete: (item: ShoppingListItem) => void;
}) {
  return (
    <SwipeableRow onDelete={() => onDelete(item)} label="Remove">
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
          onPress={() => void onToggleCart(item, !item.checked)}
        />
        {Platform.OS === "web" ? (
          <Pressable
            accessibilityLabel={`Remove ${item.name}`}
            onPress={() => onDelete(item)}
            hitSlop={8}
            style={({ pressed }) => [styles.deleteIcon, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        ) : null}
      </Card>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  filterSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: 2,
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
