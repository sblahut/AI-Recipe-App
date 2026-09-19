import { Link } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { z } from "zod";

import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { apiFetch, apiJson } from "@/lib/api";
import {
  shoppingListDetailSchema,
  shoppingListSchema,
  type ShoppingList,
  type ShoppingListDetail,
} from "@/lib/schemas";

export default function ShoppingScreen() {
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
    void (async () => {
      try {
        await loadLists();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadLists]);

  useEffect(() => {
    if (selectedId != null) {
      void loadDetail(selectedId);
    }
  }, [selectedId, loadDetail]);

  const createList = async () => {
    const name = newListName.trim();
    if (!name) return;
    await apiFetch("/shopping/lists", {
      baseUrl: serverUrl,
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setNewListName("");
    await loadLists();
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="New list name"
          value={newListName}
          onChangeText={setNewListName}
        />
        <Pressable style={styles.btn} onPress={() => void createList()}>
          <Text style={styles.btnText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        horizontal
        data={lists}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listRow}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.listChip, selectedId === item.id && styles.listChipActive]}
            onPress={() => setSelectedId(item.id)}
          >
            <Text>{item.name}</Text>
          </Pressable>
        )}
      />

      {selectedId != null ? (
        <>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Add item manually"
              value={newItemName}
              onChangeText={setNewItemName}
            />
            <Pressable style={styles.btn} onPress={() => void addItem()}>
              <Text style={styles.btnText}>Item</Text>
            </Pressable>
            <Link
              href={{ pathname: "/scan", params: { target: "shopping_list", listId: String(selectedId) } }}
              asChild
            >
              <Pressable style={styles.btn}>
                <Text style={styles.btnText}>Scan</Text>
              </Pressable>
            </Link>
          </View>

          <FlatList
            data={detail?.items ?? []}
            keyExtractor={(item) => String(item.id)}
            ListEmptyComponent={<Text style={styles.empty}>No items in this list.</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.itemRow} onPress={() => void toggleItem(item.id, item.checked)}>
                <Text style={[styles.itemText, item.checked && styles.checked]}>
                  {item.checked ? "☑" : "☐"} {item.name}
                </Text>
              </Pressable>
            )}
          />
        </>
      ) : (
        <Text style={styles.empty}>Select or create a shopping list.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, gap: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  btn: { backgroundColor: "#2563eb", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  btnText: { color: "#fff", fontWeight: "600" },
  listRow: { gap: 8, paddingVertical: 4 },
  listChip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#eee", borderRadius: 16 },
  listChipActive: { backgroundColor: "#cde8ff" },
  itemRow: { paddingVertical: 10, borderBottomWidth: 1, borderColor: "#eee" },
  itemText: { fontSize: 16 },
  checked: { textDecorationLine: "line-through", color: "#888" },
  empty: { color: "#666", textAlign: "center", marginTop: 24 },
});
