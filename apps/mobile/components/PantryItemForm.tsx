import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { ExpirationDateField } from "@/components/ExpirationDateField";
import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { Chip } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { INVENTORY_LOCATIONS } from "@/constants/inventoryLocations";
import { spacing, typography } from "@/constants/theme";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { formatUnitLabel, mergeQuantityUnitsFromApi, unitsForKind } from "@/lib/quantityUnits";
import type { Ingredient, IngredientCreate, QuantityKind } from "@/lib/schemas";

type Props = {
  initial?: Ingredient;
  unitsByKind: Record<QuantityKind, string[]>;
  onSubmit: (payload: IngredientCreate) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
};

function initialLocationState(
  location: string | null | undefined,
  customZones: readonly string[],
): {
  preset: string;
  custom: string;
} {
  if (!location?.trim()) {
    return { preset: "Pantry", custom: "" };
  }
  if (customZones.includes(location)) {
    return { preset: location, custom: "" };
  }
  const match = INVENTORY_LOCATIONS.find((loc) => loc === location);
  if (match && match !== "Other") {
    return { preset: match, custom: "" };
  }
  if (location === "Other") {
    return { preset: "Other", custom: "" };
  }
  return { preset: "Other", custom: location };
}

export function PantryItemForm({ initial, unitsByKind, onSubmit, onCancel, onDelete }: Props) {
  const { colors } = useAppTheme();
  const { preferences } = useUserPreferences();
  const resolvedUnits = useMemo(() => mergeQuantityUnitsFromApi(unitsByKind), [unitsByKind]);
  const locInit = useMemo(
    () => initialLocationState(initial?.location, preferences.customZones),
    [initial?.location, preferences.customZones],
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [quantityKind, setQuantityKind] = useState<QuantityKind>(
    initial?.quantity_kind ?? "count",
  );
  const [unit, setUnit] = useState(initial?.unit ?? resolvedUnits.count[0] ?? "each");
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? "");
  const [locationPreset, setLocationPreset] = useState(locInit.preset);
  const [customLocation, setCustomLocation] = useState(locInit.custom);
  const [expiresAt, setExpiresAt] = useState<string | null>(initial?.expires_at ?? null);
  const [saving, setSaving] = useState(false);

  const unitOptions = useMemo(
    () => unitsForKind(quantityKind, resolvedUnits, unit),
    [quantityKind, resolvedUnits, unit],
  );

  const selectKind = (kind: QuantityKind) => {
    setQuantityKind(kind);
    const options = unitsForKind(kind, resolvedUnits, unit);
    const keep = unit && options.includes(unit) ? unit : options[0];
    if (keep) {
      setUnit(keep);
    }
  };

  const resolvedLocation = (): string | null => {
    if (locationPreset === "None") {
      return null;
    }
    if (locationPreset === "Other") {
      return customLocation.trim() || null;
    }
    return locationPreset;
  };

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Enter an ingredient name.");
      return;
    }
    setSaving(true);
    try {
      const parsedQty = quantity.trim() === "" ? null : Number(quantity);
      await onSubmit({
        name: name.trim(),
        quantity_kind: quantityKind,
        unit,
        quantity: parsedQty,
        location: resolvedLocation(),
        expires_at: expiresAt,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={[styles.heading, { color: colors.text }]}>
        {initial ? "Edit ingredient" : "Add ingredient"}
      </Text>

      <AppTextField label="Name" value={name} onChangeText={setName} autoFocus={!initial} />

      <Text style={[styles.label, { color: colors.text }]}>Storage</Text>
      <View style={styles.chipRowWrap}>
        <Chip
          label="None"
          selected={locationPreset === "None"}
          onPress={() => setLocationPreset("None")}
        />
        {INVENTORY_LOCATIONS.filter((loc) => loc !== "Other").map((loc) => (
          <Chip
            key={loc}
            label={loc}
            selected={locationPreset === loc}
            onPress={() => setLocationPreset(loc)}
          />
        ))}
        {preferences.customZones.map((zone) => (
          <Chip
            key={zone}
            label={zone}
            selected={locationPreset === zone}
            onPress={() => setLocationPreset(zone)}
          />
        ))}
        <Chip
          label="Other"
          selected={locationPreset === "Other"}
          onPress={() => setLocationPreset("Other")}
        />
      </View>
      {locationPreset === "Other" ? (
        <AppTextField
          label="Custom location"
          value={customLocation}
          onChangeText={setCustomLocation}
          placeholder="Garage, spice rack…"
        />
      ) : null}

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
        {unitOptions.map((u) => (
          <Chip
            key={u}
            label={formatUnitLabel(u)}
            selected={unit === u}
            onPress={() => setUnit(u)}
          />
        ))}
      </View>

      <ExpirationDateField value={expiresAt} onChange={setExpiresAt} />

      <View style={styles.actions}>
        {initial && onDelete ? (
          <AppButton label="Delete" variant="ghost" onPress={onDelete} style={styles.deleteBtn} />
        ) : null}
        <View style={styles.actionRight}>
          <AppButton label="Cancel" variant="ghost" onPress={onCancel} />
          <AppButton label="Save" loading={saving} onPress={() => void submit()} style={styles.saveBtn} />
        </View>
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
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  actionRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  saveBtn: { minWidth: 100 },
  deleteBtn: { marginRight: "auto" },
});
