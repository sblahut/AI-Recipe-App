import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { TextInput } from "react-native";
import { z } from "zod";

import { PantryItemForm } from "@/components/PantryItemForm";
import { StorageFilterOption } from "@/components/StorageFilterOption";
import { SwipeableRow } from "@/components/SwipeableRow";
import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { SearchField, dismissSearchKeyboard } from "@/components/ui/SearchField";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { formatLocationLabel, isKnownZone } from "@/constants/inventoryLocations";
import { buildStorageFilters, type StorageFilterId } from "@/constants/storageFilters";
import { spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { apiFetch, apiJson } from "@/lib/api";
import { startIngredientScan } from "@/lib/startIngredientScan";
import { formatExpirationLabel } from "@/lib/expirationDate";
import { formatUnitLabel } from "@/lib/quantityUnits";
import { textMatchesSearch } from "@/lib/textSearch";
import { defaultUnitsByKind, mergeQuantityUnitsFromApi } from "@/lib/quantityUnits";
import {
  ingredientSchema,
  quantityUnitsSchema,
  type Ingredient,
  type IngredientCreate,
} from "@/lib/schemas";

const defaultUnits = defaultUnitsByKind();

export default function IngredientsScreen() {
  const { colors } = useAppTheme();
  const { serverUrl } = useServerSettings();
  const { preferences, addZone, removeZone } = useUserPreferences();
  const [items, setItems] = useState<Ingredient[]>([]);
  const [unitsByKind, setUnitsByKind] = useState(defaultUnits);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [locationFilter, setLocationFilter] = useState<StorageFilterId>("All");
  const [addingZone, setAddingZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);

  const storageFilters = useMemo(
    () => buildStorageFilters(preferences.customZones),
    [preferences.customZones],
  );

  const loadUnits = useCallback(async () => {
    try {
      const raw = await apiJson<unknown>("/meta/quantity-units", { baseUrl: serverUrl });
      const parsed = quantityUnitsSchema.parse(raw);
      setUnitsByKind(mergeQuantityUnitsFromApi(parsed.kinds));
    } catch {
      setUnitsByKind(defaultUnitsByKind());
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
    for (const filter of storageFilters) {
      counts.set(filter.id, 0);
    }
    for (const item of items) {
      counts.set("All", (counts.get("All") ?? 0) + 1);
      const loc = item.location?.trim() ?? "";
      if (!loc) {
        counts.set("Unassigned", (counts.get("Unassigned") ?? 0) + 1);
        continue;
      }
      if (isKnownZone(loc, preferences.customZones)) {
        counts.set(loc, (counts.get(loc) ?? 0) + 1);
      } else {
        counts.set("Other", (counts.get("Other") ?? 0) + 1);
      }
    }
    return counts;
  }, [items, preferences.customZones, storageFilters]);

  const locationFilteredItems = useMemo(() => {
    if (locationFilter === "All") {
      return items;
    }
    if (locationFilter === "Unassigned") {
      return items.filter((item) => !item.location?.trim());
    }
    return items.filter((item) => {
      const loc = item.location?.trim() ?? "";
      if (locationFilter === "Other") {
        return loc.length > 0 && !isKnownZone(loc, preferences.customZones);
      }
      return loc === locationFilter;
    });
  }, [items, locationFilter, preferences.customZones]);

  const filteredItems = useMemo(
    () =>
      locationFilteredItems.filter((item) =>
        textMatchesSearch(searchQuery, item.name, item.location, item.notes, item.barcode),
      ),
    [locationFilteredItems, searchQuery],
  );

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

  const submitZone = async () => {
    try {
      const name = newZoneName.trim();
      await addZone(name);
      setLocationFilter(name);
      setNewZoneName("");
      setAddingZone(false);
    } catch (e) {
      Alert.alert("Could not add zone", e instanceof Error ? e.message : "Unknown error");
    }
  };

  const confirmRemoveZone = (zone: string) => {
    Alert.alert(
      "Remove area",
      `Remove "${zone}" from your storage list? Ingredients already in this area stay where they are.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void (async () => {
              await removeZone(zone);
              if (locationFilter === zone) {
                setLocationFilter("All");
              }
            })();
          },
        },
      ],
    );
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

  const dismissSearch = () => dismissSearchKeyboard(searchInputRef);

  return (
    <Screen
      scroll
      padded={false}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />
      }
    >
      <View style={styles.toolbar}>
        <AppButton
          label="+ Manual"
          compact
          onPress={() => {
            dismissSearch();
            setShowForm(true);
          }}
          style={styles.toolbarBtn}
        />
        <AppButton
          label="Scan barcode"
          variant="accent"
          compact
          style={styles.toolbarBtn}
          onPress={() => {
            dismissSearch();
            void startIngredientScan();
          }}
        />
      </View>

      <Pressable style={styles.filterSection} onPress={dismissSearch}>
        <View style={styles.filterHeadingRow}>
          <Text style={[styles.filterHeading, { color: colors.textMuted }]}>Browse by storage</Text>
          {!addingZone ? (
            <AppButton
              label="+ Add area / zone"
              variant="secondary"
              compact
              onPress={() => {
                dismissSearch();
                setAddingZone(true);
              }}
            />
          ) : null}
        </View>
        {storageFilters.map((filter) => (
          <StorageFilterOption
            key={filter.id}
            label={filter.label}
            icon={filter.icon}
            selected={locationFilter === filter.id}
            count={countByFilter.get(filter.id) ?? 0}
            onPress={() => {
              dismissSearch();
              setLocationFilter(filter.id);
            }}
            {...(filter.kind === "custom"
              ? { onLongPress: () => confirmRemoveZone(filter.id) }
              : {})}
          />
        ))}
        {addingZone ? (
          <View style={styles.zoneForm}>
            <View style={styles.flex}>
              <AppTextField
                placeholder="Garage, spice rack, basement…"
                value={newZoneName}
                onChangeText={setNewZoneName}
                onSubmitEditing={() => void submitZone()}
                autoFocus
              />
            </View>
            <AppButton label="Save" compact onPress={() => void submitZone()} />
            <AppButton
              label="Cancel"
              variant="ghost"
              compact
              onPress={() => {
                setAddingZone(false);
                setNewZoneName("");
              }}
            />
          </View>
        ) : null}
      </Pressable>

      <View style={styles.searchPad}>
        <SearchField
          ref={searchInputRef}
          placeholder="Search ingredients by name, location, notes, or barcode"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {filteredItems.length === 0 ? (
        <View style={styles.list}>
          <EmptyState
            title={
              searchQuery.trim()
                ? "No matches"
                : locationFilter === "All"
                  ? "No ingredients yet"
                  : "Nothing in this location"
            }
            subtitle={
              searchQuery.trim()
                ? "Try another search or clear the search field."
                : "Add manually, scan a barcode, or pick another storage filter."
            }
          />
        </View>
      ) : (
        <View style={styles.list}>
          {filteredItems.map((item) => (
            <SwipeableRow key={item.id} onDelete={() => deleteItem(item)}>
              <Card style={styles.row}>
                <Pressable
                  onPress={() => {
                    dismissSearch();
                    setEditing(item);
                  }}
                  style={({ pressed }) => [styles.rowMain, { opacity: pressed ? 0.92 : 1 }]}
                >
                  <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.meta, { color: colors.textMuted }]}>
                    {formatIngredientMeta(item)}
                  </Text>
                </Pressable>
                {Platform.OS === "web" ? (
                  <Pressable
                    accessibilityLabel={`Delete ${item.name}`}
                    hitSlop={8}
                    onPress={() => deleteItem(item)}
                    style={({ pressed }) => [styles.deleteIcon, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                ) : null}
              </Card>
            </SwipeableRow>
          ))}
        </View>
      )}
    </Screen>
  );
}

function formatQty(item: Ingredient): string {
  if (item.quantity == null) return "No quantity set";
  const unitLabel = item.unit ? formatUnitLabel(item.unit) : "";
  return `${item.quantity} ${unitLabel}`.trim();
}

function formatIngredientMeta(item: Ingredient): string {
  const parts = [formatQty(item), formatLocationLabel(item.location)];
  const exp = formatExpirationLabel(item.expires_at);
  if (exp) {
    parts.push(`expires ${exp}`);
  }
  return parts.join(" · ");
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.sm },
  toolbar: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  toolbarBtn: { flex: 1 },
  filterSection: {
    paddingHorizontal: spacing.lg,
    gap: 2,
  },
  searchPad: {
    paddingHorizontal: spacing.lg,
  },
  filterHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  filterHeading: {
    ...typography.caption,
    fontWeight: "600",
    flex: 1,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  zoneForm: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  flex: { flex: 1 },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowMain: { flex: 1 },
  deleteIcon: { padding: spacing.sm },
  name: typography.headline,
  meta: { ...typography.caption, marginTop: 2 },
});
