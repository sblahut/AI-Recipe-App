import { Link } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PantryItemForm } from "@/components/PantryItemForm";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { apiFetch, apiJson } from "@/lib/api";
import { z } from "zod";

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
      setUnitsByKind(parsed.kinds);
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
    void refresh();
  }, [refresh]);

  const saveItem = async (payload: IngredientCreate) => {
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
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (showForm || editing) {
    return (
      <PantryItemForm
        initial={editing ?? undefined}
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
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Pressable style={styles.btn} onPress={() => setShowForm(true)}>
          <Text style={styles.btnText}>+ Manual</Text>
        </Pressable>
        <Link href="/scan" asChild>
          <Pressable style={styles.btn}>
            <Text style={styles.btnText}>Scan</Text>
          </Pressable>
        </Link>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
        ListEmptyComponent={<Text style={styles.empty}>No items yet. Add manually or scan.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => setEditing(item)}
            onLongPress={() => deleteItem(item)}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {formatQty(item)} · {item.location ?? "no location"}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function formatQty(item: Ingredient): string {
  if (item.quantity == null) return "—";
  return `${item.quantity} ${item.unit ?? ""}`.trim();
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  toolbar: { flexDirection: "row", gap: 8, padding: 12 },
  btn: { backgroundColor: "#2563eb", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  btnText: { color: "#fff", fontWeight: "600" },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: "#eee" },
  name: { fontSize: 16, fontWeight: "600" },
  meta: { color: "#555", marginTop: 4 },
  empty: { textAlign: "center", marginTop: 40, color: "#666" },
});
