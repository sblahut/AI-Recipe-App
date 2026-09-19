import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { z } from "zod";

import { PantryItemForm } from "@/components/PantryItemForm";
import { StorageFilterOption } from "@/components/StorageFilterOption";
import { AppButton } from "@/components/ui/AppButton";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { formatLocationLabel } from "@/constants/inventoryLocations";
import { STORAGE_FILTERS, type StorageFilterId } from "@/constants/storageFilters";
import { spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { apiFetch, apiJson } from "@/lib/api";
import { startIngredientScan } from "@/lib/startIngredientScan";
import {
  ingredientSchema,
  quantityUnitsSchema,
  type Ingredient,
  type IngredientCreate,
  type QuantityKind,
} from "@/lib/schemas";

const defaultUnits: Record<QuantityKind, string[]> = {
  count: ["each"],
  weight: ["g"],
  volume: ["ml"],
};

export default function IngredientsScreen() {
  const { colors } = useAppTheme();
  const { serverUrl } = useServerSettings();
  const [items, setItems] = useState<Ingredient[]>([]);
  const [unitsByKind, setUnitsByKind] = useState(defaultUnits);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [locationFilter, setLocationFilter] = useState<StorageFilterId>("All");

  const loadUnits = useCallback(async () => {
    try {
      const raw = await apiJson<unknown>("/meta/quantity-units", { baseUrl: serverUrl });
      const parsed = quantityUnitsSchema.parse(raw);
      setUnitsByKind({ ...defaultUnits, ...parsed.kinds });
    } catch {
      setUnitsByKind(defaultUnits);
    }
  }, [serverUrl]);

  const loadInventory = useCallback(async () => {
    const raw = await apiJson<unknown>("/inventory", { baseUrl: serverUrl });
    const list = z.array(ingredientSchema).parse(raw);
    setItems(list);
  }, [serverUrl]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadUnits(), loadInventory()]);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load ingredients");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [loadInventory, loadUnits]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const countByFilter = useMemo(() => {
    const counts = new Map<StorageFilterId, number>();
    for (const filter of STORAGE_FILTERS) {
      counts.set(filter.id, 0);
    }
    for (const item of items) {
      counts.set("All", (counts.get("All") ?? 0) + 1);
      const loc = item.location?.trim() ?? "";
      if (!loc) {
        counts.set("Unassigned", (counts.get("Unassigned") ?? 0) + 1);
        continue;
      }
      if (loc === "Fridge" || loc === "Pantry" || loc === "Freezer") {
        counts.set(loc, (counts.get(loc) ?? 0) + 1);
      } else {
        counts.set("Other", (counts.get("Other") ?? 0) + 1);
      }
    }
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (locationFilter === "All") {
      return items;
    }
    if (locationFilter === "Unassigned") {
      return items.filter((item) => !item.location?.trim());
    }
    return items.filter((item) => {
      const loc = item.location?.trim() ?? "";
      if (locationFilter === "Other") {
        return loc.length > 0 && loc !== "Fridge" && loc !== "Pantry" && loc !== "Freezer";
      }
      return loc === locationFilter;
    });
  }, [items, locationFilter]);

  const saveItem = async (payload: IngredientCreate) => {
    try {
      if (editing) {
        await apiFetch(`/inventory/${editing.id}`, {
          baseUrl: serverUrl,
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/inventory", {
          baseUrl: serverUrl,
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setShowForm(false);
      setEditing(null);
      await loadInventory();
    } catch (e) {
      Alert.alert("Save failed", e instanceof Error ? e.message : "Unknown error");
      throw e;
    }
  };

  const deleteItem = (item: Ingredient) => {
    Alert.alert("Delete ingredient", `Remove ${item.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await apiFetch(`/inventory/${item.id}`, { baseUrl: serverUrl, method: "DELETE" });
              if (editing?.id === item.id) {
                setEditing(null);
                setShowForm(false);
              }
              await loadInventory();
            } catch (e) {
              Alert.alert("Delete failed", e instanceof Error ? e.message : "Unknown error");
            }
          })();
        },
      },
    ]);
  };

  if (loading) {
    return <Screen loading />;
  }

  if (showForm || editing) {
    return (
      <PantryItemForm
        {...(editing ? { initial: editing } : {})}
        unitsByKind={unitsByKind}
        onSubmit={saveItem}
        onCancel={() => {
          setShowForm(false);
          setEditing(null);
        }}
        {...(editing ? { onDelete: () => deleteItem(editing) } : {})}
      />
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.toolbar}>
        <AppButton label="+ Manual" compact onPress={() => setShowForm(true)} style={styles.toolbarBtn} />
        <AppButton
          label="Scan barcode"
          variant="accent"
          compact
          style={styles.toolbarBtn}
          onPress={() => void startIngredientScan()}
        />
      </View>

      <View style={styles.filterSection}>
        <Text style={[styles.filterHeading, { color: colors.textMuted }]}>Browse by storage</Text>
        {STORAGE_FILTERS.map((filter) => (
          <StorageFilterOption
            key={filter.id}
            label={filter.label}
            icon={filter.icon}
            selected={locationFilter === filter.id}
            count={countByFilter.get(filter.id) ?? 0}
            onPress={() => setLocationFilter(filter.id)}
          />
        ))}
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={filteredItems.length === 0 ? styles.listEmpty : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            title={locationFilter === "All" ? "No ingredients yet" : "Nothing in this location"}
            subtitle="Add manually, scan a barcode, or pick another storage filter."
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <Pressable
              onPress={() => setEditing(item)}
              style={({ pressed }) => [styles.rowMain, { opacity: pressed ? 0.92 : 1 }]}
            >
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {formatQty(item)} · {formatLocationLabel(item.location)}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`Delete ${item.name}`}
              hitSlop={8}
              onPress={() => deleteItem(item)}
              style={({ pressed }) => [styles.deleteIcon, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </Card>
        )}
      />
    </Screen>
  );
}

function formatQty(item: Ingredient): string {
  if (item.quantity == null) return "No quantity set";
  return `${item.quantity} ${item.unit ?? ""}`.trim();
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  toolbarBtn: { flex: 1 },
  filterSection: {
    paddingHorizontal: spacing.lg,
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  listEmpty: { flexGrow: 1 },
  row: {
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
