import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
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
import { SwipeableRow } from "@/components/SwipeableRow";
import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
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
import {
  formatIngredientExpirationPhrase,
  isExpirationDue,
} from "@/lib/expirationDate";
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
  const params = useLocalSearchParams<{ manualAdd?: string; location?: string }>();
  const { colors } = useAppTheme();
  const { serverUrl } = useServerSettings();
  const { preferences, addZone, removeZone } = useUserPreferences();
  const [items, setItems] = useState<Ingredient[]>([]);
  const [unitsByKind, setUnitsByKind] = useState(defaultUnits);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [expandedSections, setExpandedSections] = useState<Partial<Record<StorageFilterId, boolean>>>(
    {},
  );
  const [addingZone, setAddingZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [createDefaultLocation, setCreateDefaultLocation] = useState<string | undefined>();
  const searchInputRef = useRef<TextInput>(null);
  const handledManualAdd = useRef(false);

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

  useEffect(() => {
    if (handledManualAdd.current) {
      return;
    }
    if (params.manualAdd !== "1" || !params.location?.trim()) {
      return;
    }
    handledManualAdd.current = true;
    const loc = params.location.trim();
    queueMicrotask(() => {
      setCreateDefaultLocation(loc);
      setShowForm(true);
      setExpandedSections((prev) => ({ ...prev, [loc]: true }));
    });
  }, [params.manualAdd, params.location]);

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

  const searchFilteredItems = useMemo(
    () =>
      items.filter((item) =>
        textMatchesSearch(searchQuery, item.name, item.location, item.notes, item.barcode),
      ),
    [items, searchQuery],
  );

  const itemsByStorageSection = useMemo(() => {
    const grouped = new Map<StorageFilterId, Ingredient[]>();
    for (const filter of storageFilters) {
      if (filter.id === "All") {
        continue;
      }
      grouped.set(filter.id, []);
    }
    for (const item of searchFilteredItems) {
      const sectionId = storageSectionIdForItem(item, preferences.customZones);
      const bucket = grouped.get(sectionId);
      if (bucket) {
        bucket.push(item);
      }
    }
    return grouped;
  }, [searchFilteredItems, preferences.customZones, storageFilters]);

  const storageSectionFilters = useMemo(
    () => storageFilters.filter((filter) => filter.id !== "All"),
    [storageFilters],
  );

  const isSectionExpanded = useCallback(
    (sectionId: StorageFilterId) => {
      if (sectionId in expandedSections) {
        return expandedSections[sectionId] ?? false;
      }
      return (countByFilter.get(sectionId) ?? 0) > 0;
    },
    [countByFilter, expandedSections],
  );

  const toggleSection = useCallback(
    (sectionId: StorageFilterId) => {
      setExpandedSections((prev) => ({
        ...prev,
        [sectionId]: !isSectionExpanded(sectionId),
      }));
    },
    [isSectionExpanded],
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
      setCreateDefaultLocation(undefined);
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
      setExpandedSections((prev) => ({ ...prev, [name]: true }));
      setNewZoneName("");
      setAddingZone(false);
    } catch (e) {
      Alert.alert("Could not add zone", e instanceof Error ? e.message : "Unknown error");
    }
  };

  const dismissSearch = () => dismissSearchKeyboard(searchInputRef);

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
              setExpandedSections((prev) => {
                const next = { ...prev };
                delete next[zone];
                return next;
              });
            })();
          },
        },
      ],
    );
  };

  const renderIngredientRow = (item: Ingredient) => {
    const expirationPhrase = formatIngredientExpirationPhrase(item.expires_at);
    return (
      <SwipeableRow key={item.id} onDelete={() => deleteItem(item)}>
        <Card style={styles.row}>
          <Pressable
            onPress={() => {
              dismissSearch();
              setEditing(item);
            }}
            style={({ pressed }) => [styles.rowMain, { opacity: pressed ? 0.88 : 1 }]}
          >
            <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
            <Text style={styles.meta}>
              <Text style={{ color: colors.textMuted }}>{formatIngredientMetaBase(item)}</Text>
              {expirationPhrase ? (
                <>
                  <Text style={{ color: colors.textMuted }}> · </Text>
                  <Text
                    style={{
                      color: isExpirationDue(item.expires_at) ? colors.danger : colors.textMuted,
                    }}
                  >
                    {expirationPhrase}
                  </Text>
                </>
              ) : null}
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
    );
  };

  if (loading) {
    return <Screen loading />;
  }

  if (showForm || editing) {
    return (
      <PantryItemForm
        {...(editing ? { initial: editing } : {})}
        {...(!editing && createDefaultLocation ? { defaultLocation: createDefaultLocation } : {})}
        unitsByKind={unitsByKind}
        onSubmit={saveItem}
        onCancel={() => {
          setShowForm(false);
          setEditing(null);
          setCreateDefaultLocation(undefined);
        }}
        {...(editing ? { onDelete: () => deleteItem(editing) } : {})}
      />
    );
  }

  const greeting = preferences.username.trim()
    ? `${preferences.username.trim()}'s kitchen`
    : "Your kitchen";

  return (
    <Screen
      scroll
      padded={false}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />
      }
    >
      {/* Greeting + summary header */}
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.text }]}>{greeting}</Text>
        <Text style={[styles.summary, { color: colors.textMuted }]}>
          {items.length === 0
            ? "Add your first ingredient to get started"
            : `${items.length} ingredient${items.length === 1 ? "" : "s"} on hand`}
        </Text>
      </View>

      {/* Quick actions */}
      <View style={styles.actionRow}>
        <Pressable
          onPress={() => {
            dismissSearch();
            setShowForm(true);
          }}
          style={({ pressed }) => [
            styles.actionCard,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="add-outline" size={22} color={colors.primary} />
          <Text style={[styles.actionLabel, { color: colors.text }]}>Add item</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            dismissSearch();
            void startIngredientScan();
          }}
          style={({ pressed }) => [
            styles.actionCard,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="barcode-outline" size={22} color={colors.accent} />
          <Text style={[styles.actionLabel, { color: colors.text }]}>Scan barcode</Text>
        </Pressable>
      </View>

      {/* Storage areas */}
      <Pressable style={styles.filterSection} onPress={dismissSearch}>
        <View style={styles.filterHeadingRow}>
          <Text style={[styles.filterHeading, { color: colors.textMuted }]}>By storage</Text>
          {!addingZone ? (
            <AppButton
              label="+ Add area"
              variant="ghost"
              compact
              onPress={() => {
                dismissSearch();
                setAddingZone(true);
              }}
            />
          ) : null}
        </View>
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

      {/* Search */}
      <View style={styles.searchPad}>
        <SearchField
          ref={searchInputRef}
          placeholder="Search by name, location, or barcode"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Ingredient list by storage */}
      {items.length === 0 ? (
        <View style={styles.list}>
          <EmptyState
            icon="nutrition-outline"
            title="No ingredients yet"
            subtitle="Add items manually or scan a barcode to start building your pantry."
          />
        </View>
      ) : searchFilteredItems.length === 0 ? (
        <View style={styles.list}>
          <EmptyState
            icon="search-outline"
            title="No matches"
            subtitle="Try a different search term."
          />
        </View>
      ) : (
        <View style={styles.list}>
          {storageSectionFilters.map((filter) => {
            const sectionItems = itemsByStorageSection.get(filter.id) ?? [];
            if (sectionItems.length === 0) {
              return null;
            }
            const totalInSection = countByFilter.get(filter.id) ?? 0;
            const title =
              searchQuery.trim() && sectionItems.length !== totalInSection
                ? `${filter.label} (${sectionItems.length} of ${totalInSection})`
                : `${filter.label} (${totalInSection})`;
            return (
              <CollapsibleSection
                key={filter.id}
                title={title}
                leadingIcon={filter.icon}
                expanded={isSectionExpanded(filter.id)}
                onToggle={() => {
                  dismissSearch();
                  toggleSection(filter.id);
                }}
                {...(filter.kind === "custom"
                  ? { onHeaderLongPress: () => confirmRemoveZone(filter.id) }
                  : {})}
              >
                <View style={styles.sectionItems}>
                  {sectionItems.map((item) => renderIngredientRow(item))}
                </View>
              </CollapsibleSection>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function storageSectionIdForItem(
  item: Ingredient,
  customZones: readonly string[],
): StorageFilterId {
  const loc = item.location?.trim() ?? "";
  if (!loc) {
    return "Unassigned";
  }
  if (isKnownZone(loc, customZones)) {
    return loc;
  }
  return "Other";
}

function formatQty(item: Ingredient): string {
  if (item.quantity == null) return "No quantity set";
  const unitLabel = item.unit ? formatUnitLabel(item.unit) : "";
  return `${item.quantity} ${unitLabel}`.trim();
}

function formatIngredientMetaBase(item: Ingredient): string {
  return [formatQty(item), formatLocationLabel(item.location)].join(" · ");
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.sm },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.xs,
  },
  greeting: {
    ...typography.h1,
  },
  summary: {
    ...typography.body,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  actionCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionLabel: {
    ...typography.button,
  },
  filterSection: {
    paddingHorizontal: spacing.xl,
    gap: 2,
  },
  filterHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  filterHeading: {
    ...typography.captionMedium,
    flex: 1,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  zoneForm: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  flex: { flex: 1 },
  searchPad: {
    paddingHorizontal: spacing.xl,
  },
  list: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  sectionItems: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowMain: { flex: 1 },
  deleteIcon: { padding: spacing.sm },
  name: { ...typography.headline },
  meta: { ...typography.caption, marginTop: 2 },
});
