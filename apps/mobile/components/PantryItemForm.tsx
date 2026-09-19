import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { Ingredient, IngredientCreate, QuantityKind } from "@/lib/schemas";

type Props = {
  initial?: Ingredient;
  unitsByKind: Record<QuantityKind, string[]>;
  onSubmit: (payload: IngredientCreate) => Promise<void>;
  onCancel: () => void;
};

export function PantryItemForm({ initial, unitsByKind, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [quantityKind, setQuantityKind] = useState<QuantityKind>(
    initial?.quantity_kind ?? "count",
  );
  const [unit, setUnit] = useState(initial?.unit ?? unitsByKind.count[0] ?? "each");
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const units = unitsByKind[quantityKind];
    if (units.length > 0 && !units.includes(unit)) {
      setUnit(units[0] ?? "each");
    }
  }, [quantityKind, unit, unitsByKind]);

  const submit = async () => {
    setSaving(true);
    try {
      const parsedQty = quantity.trim() === "" ? null : Number(quantity);
      await onSubmit({
        name: name.trim(),
        quantity_kind: quantityKind,
        unit,
        quantity: parsedQty,
        location: location.trim() || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.box}>
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Kind</Text>
      <View style={styles.row}>
        {(["count", "weight", "volume"] as const).map((kind) => (
          <Pressable
            key={kind}
            style={[styles.chip, quantityKind === kind && styles.chipActive]}
            onPress={() => setQuantityKind(kind)}
          >
            <Text>{kind}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Quantity</Text>
      <TextInput
        style={styles.input}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Unit</Text>
      <View style={styles.rowWrap}>
        {unitsByKind[quantityKind].map((u) => (
          <Pressable
            key={u}
            style={[styles.chip, unit === u && styles.chipActive]}
            onPress={() => setUnit(u)}
          >
            <Text>{u}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Location</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} />

      <View style={styles.actions}>
        <Pressable style={styles.btnSecondary} onPress={onCancel}>
          <Text>Cancel</Text>
        </Pressable>
        <Pressable style={styles.btnPrimary} onPress={() => void submit()} disabled={saving}>
          <Text style={styles.btnPrimaryText}>{saving ? "Saving…" : "Save"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8, padding: 16 },
  label: { fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  row: { flexDirection: "row", gap: 8 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#eee",
  },
  chipActive: { backgroundColor: "#cde8ff" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 8 },
  btnSecondary: { padding: 10 },
  btnPrimary: { backgroundColor: "#2563eb", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  btnPrimaryText: { color: "#fff", fontWeight: "600" },
});
