import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { Chip } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { spacing, typography } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import type { Ingredient, IngredientCreate, QuantityKind } from "@/lib/schemas";

type Props = {
  initial?: Ingredient;
  unitsByKind: Record<QuantityKind, string[]>;
  onSubmit: (payload: IngredientCreate) => Promise<void>;
  onCancel: () => void;
};

export function PantryItemForm({ initial, unitsByKind, onSubmit, onCancel }: Props) {
  const { colors } = useAppTheme();
  const [name, setName] = useState(initial?.name ?? "");
  const [quantityKind, setQuantityKind] = useState<QuantityKind>(
    initial?.quantity_kind ?? "count",
  );
  const [unit, setUnit] = useState(initial?.unit ?? unitsByKind.count[0] ?? "each");
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [saving, setSaving] = useState(false);

  const selectKind = (kind: QuantityKind) => {
    setQuantityKind(kind);
    const units = unitsByKind[kind];
    if (units.length > 0) {
      setUnit(units[0] ?? "each");
    }
  };

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
    <Screen scroll>
      <Text style={[styles.heading, { color: colors.text }]}>
        {initial ? "Edit item" : "Add to pantry"}
      </Text>

      <AppTextField label="Name" value={name} onChangeText={setName} autoFocus={!initial} />

      <Text style={[styles.label, { color: colors.text }]}>Kind</Text>
      <View style={styles.chipRow}>
        {(["count", "weight", "volume"] as const).map((kind) => (
          <Chip
            key={kind}
            label={kind}
            selected={quantityKind === kind}
            onPress={() => selectKind(kind)}
          />
        ))}
      </View>

      <AppTextField
        label="Quantity"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
        placeholder="Optional"
      />

      <Text style={[styles.label, { color: colors.text }]}>Unit</Text>
      <View style={styles.chipRowWrap}>
        {unitsByKind[quantityKind].map((u) => (
          <Chip key={u} label={u} selected={unit === u} onPress={() => setUnit(u)} />
        ))}
      </View>

      <AppTextField
        label="Location"
        value={location}
        onChangeText={setLocation}
        placeholder="Pantry, fridge, freezer…"
      />

      <View style={styles.actions}>
        <AppButton label="Cancel" variant="ghost" onPress={onCancel} />
        <AppButton label="Save" loading={saving} onPress={() => void submit()} style={styles.saveBtn} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { ...typography.title, marginBottom: spacing.sm },
  label: { ...typography.label, marginTop: spacing.xs },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chipRowWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  saveBtn: { minWidth: 120 },
});
