import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { AppButton } from "@/components/ui/AppButton";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { apiFetch, apiJson } from "@/lib/api";
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

export default function PantryScreen() {
  const { colors } = useAppTheme();
  const { serverUrl } = useServerSettings();
  const [items, setItems] = useState<Ingredient[]>([]);
  const [unitsByKind, setUnitsByKind] = useState(defaultUnits);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);

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
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load pantry");
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
    Alert.alert("Delete item", `Remove ${item.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await apiFetch(`/inventory/${item.id}`, { baseUrl: serverUrl, method: "DELETE" });
            await loadInventory();
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
          onPress={() => router.push("/scan")}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={items.length === 0 ? styles.listEmpty : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            title="Your pantry is empty"
            subtitle="Add items manually or scan a barcode to get started."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setEditing(item)}
            onLongPress={() => deleteItem(item)}
            style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
          >
            <Card style={styles.row}>
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {formatQty(item)}
                {item.location ? ` · ${item.location}` : ""}
              </Text>
            </Card>
          </Pressable>
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  listEmpty: { flexGrow: 1 },
  row: { marginBottom: spacing.sm },
  name: typography.headline,
  meta: { ...typography.caption, marginTop: 2 },
});
