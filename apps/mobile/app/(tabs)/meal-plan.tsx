import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { AppButton } from "@/components/ui/AppButton";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { apiFetch, apiJson } from "@/lib/api";
import {
  MEAL_SLOT_LABELS,
  MEAL_SLOTS,
  type MealSlot,
  addDays,
  daysInWeek,
  formatPlanDate,
  mealSlotSortIndex,
  mondayOnOrBefore,
  weekdayLabel,
  weekRangeFromWeekStart,
} from "@/lib/mealPlanWeek";
import {
  mealPlanEntrySchema,
  savedRecipeReadSchema,
  shoppingFromMealPlanResponseSchema,
  shoppingListSchema,
  type MealPlanEntry,
  type SavedRecipe,
  type ShoppingList,
} from "@/lib/schemas";

export default function MealPlanScreen() {
  const { colors } = useAppTheme();
  const { serverUrl } = useServerSettings();
  const [weekStart, setWeekStart] = useState(() => mondayOnOrBefore(new Date()));
  const [entries, setEntries] = useState<MealPlanEntry[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopLoading, setShopLoading] = useState(false);

  const weekRange = useMemo(() => weekRangeFromWeekStart(weekStart), [weekStart]);
  const weekDays = useMemo(() => daysInWeek(weekStart), [weekStart]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, MealPlanEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.plan_date) ?? [];
      list.push(entry);
      map.set(entry.plan_date, list);
    }
    for (const [key, list] of map) {
      list.sort(
        (a, b) =>
          mealSlotSortIndex(a.meal_slot) - mealSlotSortIndex(b.meal_slot) || a.id - b.id,
      );
      map.set(key, list);
    }
    return map;
  }, [entries]);

  const loadPlan = useCallback(async () => {
    const params = new URLSearchParams({ start: weekRange.start, end: weekRange.end });
    const raw = await apiJson<unknown>(`/meal-plan?${params.toString()}`, { baseUrl: serverUrl });
    setEntries(z.array(mealPlanEntrySchema).parse(raw));
  }, [serverUrl, weekRange.end, weekRange.start]);

  const loadSaved = useCallback(async () => {
    const raw = await apiJson<unknown>("/recipes/saved", { baseUrl: serverUrl });
    setSavedRecipes(z.array(savedRecipeReadSchema).parse(raw));
  }, [serverUrl]);

  const loadLists = useCallback(async () => {
    const raw = await apiJson<unknown>("/shopping/lists", { baseUrl: serverUrl });
    setLists(z.array(shoppingListSchema).parse(raw));
  }, [serverUrl]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadPlan(), loadSaved(), loadLists()]);
    } catch (e) {
      Alert.alert("Meal plan", e instanceof Error ? e.message : "Could not load plan");
    } finally {
      setLoading(false);
    }
  }, [loadLists, loadPlan, loadSaved]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const pickRecipeAndAdd = (planDate: string, mealSlot: MealSlot) => {
    if (savedRecipes.length === 0) {
      Alert.alert(
        "No saved recipes",
        "Save or favorite a recipe on the Recipes tab, then assign it here.",
      );
      return;
    }
    Alert.alert(
      MEAL_SLOT_LABELS[mealSlot],
      `Pick a recipe for ${planDate}`,
      [
        ...savedRecipes.map((row) => ({
          text: row.title,
          onPress: () => {
            void (async () => {
              try {
                await apiFetch("/meal-plan", {
                  baseUrl: serverUrl,
                  method: "POST",
                  body: JSON.stringify({
                    plan_date: planDate,
                    meal_slot: mealSlot,
                    saved_recipe_id: row.id,
                  }),
                });
                await loadPlan();
              } catch (e) {
                Alert.alert("Add failed", e instanceof Error ? e.message : "Unknown error");
              }
            })();
          },
        })),
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const promptAddMeal = (planDate: string) => {
    Alert.alert("Add meal", planDate, [
      ...MEAL_SLOTS.map((slot) => ({
        text: MEAL_SLOT_LABELS[slot],
        onPress: () => pickRecipeAndAdd(planDate, slot),
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removeEntry = (entry: MealPlanEntry) => {
    Alert.alert("Remove meal?", `${entry.recipe_title} (${MEAL_SLOT_LABELS[entry.meal_slot]})`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await apiFetch(`/meal-plan/${entry.id}`, {
                baseUrl: serverUrl,
                method: "DELETE",
              });
              await loadPlan();
            } catch (e) {
              Alert.alert("Remove failed", e instanceof Error ? e.message : "Unknown error");
            }
          })();
        },
      },
    ]);
  };

  const shopThisWeek = () => {
    if (entries.length === 0) {
      Alert.alert("Nothing planned", "Add meals to this week before building a shopping list.");
      return;
    }
    if (lists.length === 0) {
      Alert.alert("No lists", "Create a shopping list on the Shopping tab first.");
      return;
    }
    Alert.alert("Shop this week", `${weekRange.start} → ${weekRange.end}`, [
      ...lists.map((list) => ({
        text: list.name,
        onPress: () => {
          void (async () => {
            setShopLoading(true);
            try {
              const raw = await apiJson<unknown>("/shopping/from-meal-plan", {
                baseUrl: serverUrl,
                method: "POST",
                body: JSON.stringify({
                  list_id: list.id,
                  start_date: weekRange.start,
                  end_date: weekRange.end,
                }),
              });
              const result = shoppingFromMealPlanResponseSchema.parse(raw);
              const skipped = result.skipped_in_pantry.length;
              const added = result.added.length;
              const missing = result.missing_entry_ids.length;
              let detail = `${added} line${added === 1 ? "" : "s"} updated on ${list.name}.`;
              if (skipped > 0) {
                detail += ` ${skipped} already in pantry.`;
              }
              if (missing > 0) {
                detail += ` ${missing} planned meal(s) had missing recipes.`;
              }
              Alert.alert(added > 0 ? "List updated" : "Nothing to buy", detail);
            } catch (e) {
              Alert.alert("Shop failed", e instanceof Error ? e.message : "Unknown error");
            } finally {
              setShopLoading(false);
            }
          })();
        },
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <Screen scroll contentContainerStyle={styles.scroll}>
      <Text style={[styles.lead, { color: colors.textMuted }]}>
        Plan the week from saved recipes, then send missing ingredients to a shopping list.
      </Text>

      <View style={styles.weekNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          onPress={() => setWeekStart((current) => addDays(current, -7))}
          style={({ pressed }) => [styles.weekArrow, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={[styles.weekLabel, { color: colors.text }]}>
          {weekRange.start} — {weekRange.end}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next week"
          onPress={() => setWeekStart((current) => addDays(current, 7))}
          style={({ pressed }) => [styles.weekArrow, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <AppButton
        label={shopLoading ? "Adding…" : "Shop this week"}
        loading={shopLoading}
        onPress={shopThisWeek}
      />

      {loading ? (
        <Text style={[styles.loading, { color: colors.textMuted }]}>Loading…</Text>
      ) : (
        weekDays.map((day) => {
          const planDate = formatPlanDate(day);
          const dayEntries = entriesByDate.get(planDate) ?? [];
          return (
            <Card key={planDate}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayTitle, { color: colors.text }]}>{weekdayLabel(day)}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add meal on ${planDate}`}
                  onPress={() => promptAddMeal(planDate)}
                  style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
                >
                  <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
                </Pressable>
              </View>
              {dayEntries.length === 0 ? (
                <Text style={[styles.emptyDay, { color: colors.textMuted }]}>No meals planned</Text>
              ) : (
                dayEntries.map((entry) => (
                  <Pressable
                    key={entry.id}
                    onLongPress={() => removeEntry(entry)}
                    style={({ pressed }) => [styles.entryRow, pressed && styles.pressed]}
                  >
                    <Text style={[styles.entrySlot, { color: colors.textMuted }]}>
                      {MEAL_SLOT_LABELS[entry.meal_slot]}
                    </Text>
                    <Text style={[styles.entryTitle, { color: colors.text }]}>{entry.recipe_title}</Text>
                  </Pressable>
                ))
              )}
            </Card>
          );
        })
      )}

      {!loading && savedRecipes.length === 0 ? (
        <EmptyState
          title="Save recipes first"
          subtitle="Star or save recipes on the Recipes tab, then assign them to your plan."
        />
      ) : null}

      <Text style={[styles.hint, { color: colors.textMuted }]}>Long-press a meal to remove it.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  lead: {
    ...typography.body,
    paddingHorizontal: spacing.lg,
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  weekArrow: {
    padding: spacing.sm,
  },
  weekLabel: {
    ...typography.headline,
    fontSize: 16,
  },
  loading: {
    ...typography.body,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  dayTitle: {
    ...typography.headline,
    fontSize: 17,
  },
  addButton: {
    padding: spacing.xs,
  },
  emptyDay: {
    ...typography.body,
    fontSize: 14,
  },
  entryRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.25)",
  },
  entrySlot: {
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  entryTitle: {
    ...typography.body,
    fontWeight: "600",
  },
  hint: {
    ...typography.caption,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.7,
  },
});
