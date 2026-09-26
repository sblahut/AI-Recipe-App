import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { Chip } from "@/components/ui/Chip";
import { DismissibleModal } from "@/components/ui/DismissibleModal";
import { INVENTORY_LOCATIONS } from "@/constants/inventoryLocations";
import { spacing, typography } from "@/constants/theme";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  formatUnitLabel,
  mergeQuantityUnitsFromApi,
  unitsForKind,
} from "@/lib/quantityUnits";
import type { QuantityKind } from "@/lib/schemas";

export type ReceiptReviewItemFields = {
  name: string;
  quantity: number | null;
  quantity_kind: QuantityKind;
  unit: string | null;
  location: string;
};

type Props = {
  visible: boolean;
  item: ReceiptReviewItemFields | null;
  unitsByKind: Record<QuantityKind, string[]>;
  onClose: () => void;
  onSave: (updated: ReceiptReviewItemFields) => void;
};

export function ReceiptItemEditModal({
  visible,
  item,
  unitsByKind,
  onClose,
  onSave,
}: Props) {
  const { colors } = useAppTheme();
  const { preferences } = useUserPreferences();
  const resolvedUnits = useMemo(() => mergeQuantityUnitsFromApi(unitsByKind), [unitsByKind]);

  const [name, setName] = useState("");
  const [quantityKind, setQuantityKind] = useState<QuantityKind>("count");
  const [unit, setUnit] = useState("each");
  const [quantity, setQuantity] = useState("");
  const [locationPreset, setLocationPreset] = useState("Pantry");
  const [customLocation, setCustomLocation] = useState("");

  useEffect(() => {
    if (!item || !visible) {
      return;
    }
    setName(item.name);
    setQuantityKind(item.quantity_kind);
    setUnit(item.unit ?? resolvedUnits[item.quantity_kind][0] ?? "each");
    setQuantity(item.quantity != null ? String(item.quantity) : "");
    const loc = item.location.trim();
    if (preferences.customZones.includes(loc)) {
      setLocationPreset(loc);
      setCustomLocation("");
    } else if ((INVENTORY_LOCATIONS as readonly string[]).includes(loc)) {
      setLocationPreset(loc === "Other" ? "Other" : loc);
      setCustomLocation("");
    } else if (loc) {
      setLocationPreset("Other");
      setCustomLocation(loc);
    } else {
      setLocationPreset("Pantry");
      setCustomLocation("");
    }
  }, [item, visible, preferences.customZones, resolvedUnits]);

  const unitOptions = useMemo(
    () => unitsForKind(quantityKind, resolvedUnits, unit),
    [quantityKind, resolvedUnits, unit],
  );

  const selectKind = (kind: QuantityKind) => {
    setQuantityKind(kind);
    const options = unitsForKind(kind, resolvedUnits, unit);
    setUnit(options[0] ?? "each");
  };

  const resolvedLocation = (): string => {
    if (locationPreset === "Other") {
      return customLocation.trim() || "Pantry";
    }
    return locationPreset;
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    const parsedQty = quantity.trim() === "" ? null : Number(quantity);
    onSave({
      name: trimmed,
      quantity_kind: quantityKind,
      unit,
      quantity: parsedQty != null && Number.isFinite(parsedQty) ? parsedQty : null,
      location: resolvedLocation(),
    });
    onClose();
  };

  const locationChips = useMemo(() => {
    const builtins = INVENTORY_LOCATIONS.filter((loc) => loc !== "Other");
    return [...builtins, ...preferences.customZones];
  }, [preferences.customZones]);

  return (
    <DismissibleModal visible={visible} onClose={onClose} variant="bottomSheet">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.text }]}>Edit item</Text>

        <AppTextField label="Name" value={name} onChangeText={setName} />

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Storage</Text>
          <View style={styles.chipWrap}>
            {locationChips.map((loc) => (
              <Chip
                key={loc}
                label={loc}
                selected={locationPreset === loc}
                onPress={() => {
                  setLocationPreset(loc);
                  setCustomLocation("");
                }}
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
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Measurement</Text>
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
        </View>

        <View style={styles.quantityRow}>
          <View style={styles.quantityField}>
            <AppTextField
              label="Quantity"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              placeholder="e.g. 2"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Unit / size</Text>
          <View style={styles.chipWrap}>
            {unitOptions.map((u) => (
              <Chip
                key={u}
                label={formatUnitLabel(u)}
                selected={unit === u}
                onPress={() => setUnit(u)}
                capitalize={false}
              />
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <AppButton label="Save" onPress={save} disabled={!name.trim()} />
          <AppButton label="Cancel" variant="ghost" onPress={onClose} />
        </View>
      </ScrollView>
    </DismissibleModal>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: "85%",
  },
  scrollContent: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    marginBottom: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.captionMedium,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  quantityRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  quantityField: {
    flex: 1,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
