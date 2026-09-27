import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import {
  ReceiptItemEditModal,
  type ReceiptReviewItemFields,
} from "@/components/ReceiptItemEditModal";
import { AppButton } from "@/components/ui/AppButton";
import { Chip } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { INVENTORY_LOCATIONS } from "@/constants/inventoryLocations";
import { spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useHomeServerReady } from "@/hooks/useHomeServerReady";
import { apiFetch, apiJson } from "@/lib/api";
import {
  defaultUnitsByKind,
  formatUnitLabel,
  mergeQuantityUnitsFromApi,
} from "@/lib/quantityUnits";
import {
  pickReceiptImageBase64,
  receiptImageSourceOptions,
  type ReceiptImageSource,
} from "@/lib/pickReceiptImage";
import { proposePurchaseItems } from "@/lib/proposePurchaseItems";
import type { IngredientCreate, ProposedIngredient } from "@/lib/schemas";
import { quantityUnitsSchema } from "@/lib/schemas";

const DEFAULT_ITEM_LOCATION = "Pantry";

type ReviewRow = ReceiptReviewItemFields & {
  id: string;
  selected: boolean;
};

function formatProposedQty(item: ReceiptReviewItemFields): string {
  if (item.quantity == null) {
    return "Qty not set — tap Edit";
  }
  const unit = item.unit ? formatUnitLabel(item.unit) : "";
  const kind =
    item.quantity_kind !== "count" ? ` (${item.quantity_kind})` : "";
  return `${item.quantity}${unit ? ` ${unit}` : ""}${kind}`.trim();
}

function toReviewRows(items: ProposedIngredient[], defaultLocation: string): ReviewRow[] {
  return items.map((item, index) => ({
    id: `${index}-${item.name}`,
    selected: true,
    name: item.name,
    quantity: item.quantity ?? null,
    quantity_kind: item.quantity_kind ?? "count",
    unit: item.unit ?? null,
    location: defaultLocation,
  }));
}

export default function ReceiptImportScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { serverUrl } = useServerSettings();
  const { ready } = useHomeServerReady();
  const { preferences } = useUserPreferences();

  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [unitsByKind, setUnitsByKind] = useState(defaultUnitsByKind());

  const storageChipOptions = useMemo(() => {
    const builtins = INVENTORY_LOCATIONS.filter((loc) => loc !== "Other");
    return [...builtins, ...preferences.customZones];
  }, [preferences.customZones]);

  const editingRow = useMemo(
    () => rows.find((row) => row.id === editingId) ?? null,
    [rows, editingId],
  );

  const inReview = rows.length > 0;
  const selectedCount = useMemo(() => rows.filter((row) => row.selected).length, [rows]);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await apiJson<unknown>("/meta/quantity-units", { baseUrl: serverUrl });
        const parsed = quantityUnitsSchema.parse(raw);
        setUnitsByKind(mergeQuantityUnitsFromApi(parsed.kinds));
      } catch {
        setUnitsByKind(defaultUnitsByKind());
      }
    })();
  }, [serverUrl]);

  const runPropose = useCallback(
    async (source: Parameters<typeof proposePurchaseItems>[0]) => {
      if (ready.ollamaOk !== true) {
        Alert.alert(
          "Ollama offline",
          "Receipt and invoice import needs Ollama on your home PC (same text model as recipe import). Photos are read with OCR on the server first.",
        );
        return;
      }
      setAnalyzing(true);
      try {
        const items = await proposePurchaseItems(source, serverUrl);
        setRows(toReviewRows(items, DEFAULT_ITEM_LOCATION));
      } catch (e) {
        Alert.alert("Could not read document", e instanceof Error ? e.message : "Import failed");
      } finally {
        setAnalyzing(false);
      }
    },
    [ready.ollamaOk, serverUrl],
  );

  const pickImage = async (source: ReceiptImageSource) => {
    try {
      const base64 = await pickReceiptImageBase64(source);
      if (!base64) {
        return;
      }
      await runPropose({ kind: "image", imageBase64: base64 });
    } catch (e) {
      Alert.alert("Photo", e instanceof Error ? e.message : "Could not use that photo");
    }
  };

  const updateRow = (id: string, patch: Partial<ReviewRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const confirmAdd = async () => {
    const chosen = rows.filter((row) => row.selected);
    if (chosen.length === 0) {
      Alert.alert("No items selected", "Turn on at least one item to add to your pantry.");
      return;
    }
    const items: IngredientCreate[] = chosen.map((row) => ({
      name: row.name.trim(),
      location: row.location,
      quantity: row.quantity ?? undefined,
      quantity_kind: row.quantity_kind,
      unit: row.unit ?? undefined,
    }));
    setSaving(true);
    try {
      await apiFetch("/inventory/bulk", {
        baseUrl: serverUrl,
        method: "POST",
        body: JSON.stringify({ items }),
      });
      const zoneCount = new Set(chosen.map((row) => row.location)).size;
      const firstLocation = chosen[0]?.location ?? DEFAULT_ITEM_LOCATION;
      const detail =
        zoneCount === 1
          ? `Added to ${firstLocation}.`
          : `Added across ${zoneCount} storage areas.`;
      Alert.alert(
        "Added to pantry",
        `${items.length} item${items.length === 1 ? "" : "s"}. ${detail}`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (e) {
      Alert.alert("Add failed", e instanceof Error ? e.message : "Could not save items");
    } finally {
      setSaving(false);
    }
  };

  if (analyzing) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            Reading receipt or invoice…
          </Text>
        </View>
      </Screen>
    );
  }

  if (inReview) {
    return (
      <Screen>
        <Text style={[styles.lead, { color: colors.textMuted }]}>
          Include each line you want, pick a storage area per item, and tap Edit to fix name or
          size.
        </Text>
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listPad}
          renderItem={({ item }) => (
            <View
              style={[
                styles.reviewCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: item.selected ? colors.primary : colors.border,
                  opacity: item.selected ? 1 : 0.65,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Switch
                  value={item.selected}
                  onValueChange={(value) => updateRow(item.id, { selected: value })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
                <View style={styles.reviewMain}>
                  <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                    {formatProposedQty(item)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setEditingId(item.id)}
                  style={({ pressed }) => [
                    styles.editButton,
                    { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${item.name}`}
                >
                  <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                  <Text style={[styles.editLabel, { color: colors.primary }]}>Edit</Text>
                </Pressable>
              </View>

              <Text style={[styles.zoneLabel, { color: colors.textMuted }]}>Storage</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.zoneChipRow}
              >
                {storageChipOptions.map((zone) => (
                  <Chip
                    key={`${item.id}-${zone}`}
                    label={zone}
                    selected={item.location === zone}
                    onPress={() => updateRow(item.id, { location: zone })}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        />
        <View style={styles.footer}>
          <AppButton
            label={`Add ${selectedCount} to pantry`}
            onPress={() => void confirmAdd()}
            disabled={saving || selectedCount === 0}
          />
          <AppButton
            label="Start over"
            variant="ghost"
            onPress={() => setRows([])}
            disabled={saving}
          />
        </View>

        <ReceiptItemEditModal
          visible={editingId != null}
          item={editingRow}
          unitsByKind={unitsByKind}
          onClose={() => setEditingId(null)}
          onSave={(updated) => {
            if (!editingId) {
              return;
            }
            updateRow(editingId, updated);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={[styles.lead, { color: colors.textMuted }]}>
        Take a photo or choose an image of a receipt or invoice. You will review line items and
        pick storage for each one before adding to your pantry.
      </Text>

      <View style={styles.photoRow}>
        {receiptImageSourceOptions().map((source) => (
          <Pressable
            key={source}
            onPress={() => void pickImage(source)}
            style={({ pressed }) => [
              styles.photoCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons
              name={source === "camera" ? "camera-outline" : "image-outline"}
              size={22}
              color={colors.primary}
            />
            <Text style={[styles.photoLabel, { color: colors.text }]}>
              {source === "camera" ? "Take photo" : "Choose photo"}
            </Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  statusText: {
    ...typography.body,
  },
  lead: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  photoRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  photoCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  photoLabel: {
    ...typography.button,
  },
  listPad: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  reviewCard: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  reviewMain: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    ...typography.headline,
  },
  itemMeta: {
    ...typography.caption,
    marginTop: 2,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
  },
  editLabel: {
    ...typography.captionMedium,
  },
  zoneLabel: {
    ...typography.captionMedium,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: spacing.xs,
  },
  zoneChipRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  footer: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
});
