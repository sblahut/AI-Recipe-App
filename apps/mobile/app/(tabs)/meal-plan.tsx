import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { AppButton } from "@/components/ui/AppButton";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { radius, spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { apiFetch, apiJson } from "@/lib/api";
import {
  mealPlanShopAlertMessage,
  mealPlanShopAlertTitle,
  mealPlanShopResultFromApi,
} from "@/lib/shoppingFromMealPlanAlert";
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
      Alert.alert("No lists", "Create a shopping list on the Shop tab first.");
      return;
    }
    Alert.alert(
      "Shop for this week",
      "Choose which list to add missing groceries to. Items you already have won't be duplicated.",
      [
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
              const summary = mealPlanShopResultFromApi(result);
              Alert.alert(
                mealPlanShopAlertTitle(summary),
                mealPlanShopAlertMessage(summary, list.name),
              );
            } catch (e) {
              Alert.alert(
                "Shopping list",
                e instanceof Error ? e.message : "Could not update shopping list",
              );
            } finally {
              setShopLoading(false);
            }
          })();
        },
      })),
      { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const today = formatPlanDate(new Date());

  return (
    <Screen scroll contentContainerStyle={styles.scroll}>
      {/* Week navigation */}
      <View style={styles.weekNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          onPress={() => setWeekStart((current) => addDays(current, -7))}
          style={({ pressed }) => [styles.weekArrow, pressed && styles.pressed]}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <View style={styles.weekCenter}>
          <Text style={[styles.weekLabel, { color: colors.text }]}>
            {weekRange.start} — {weekRange.end}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next week"
          onPress={() => setWeekStart((current) => addDays(current, 7))}
          style={({ pressed }) => [styles.weekArrow, pressed && styles.pressed]}
          hitSlop={12}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {/* Shop this week CTA */}
      <AppButton
        label={shopLoading ? "Adding groceries…" : "Shop for this week"}
        variant="accent"
        loading={shopLoading}
        onPress={shopThisWeek}
      />

      {/* Day cards */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading your plan…</Text>
        </View>
      ) : (
        weekDays.map((day) => {
          const planDate = formatPlanDate(day);
          const dayEntries = entriesByDate.get(planDate) ?? [];
          const isToday = planDate === today;
          return (
            <Card
              key={planDate}
              style={isToday ? [styles.todayCard, { borderColor: colors.primary }] : undefined}
            >
              <View style={styles.dayHeader}>
                <View style={styles.dayTitleRow}>
                  <Text style={[styles.dayTitle, { color: colors.text }]}>{weekdayLabel(day)}</Text>
                  {isToday ? (
                    <View style={[styles.todayBadge, { backgroundColor: colors.primaryMuted }]}>
                      <Text style={[styles.todayBadgeText, { color: colors.primary }]}>Today</Text>
                    </View>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add meal on ${planDate}`}
                  onPress={() => promptAddMeal(planDate)}
                  style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
                  hitSlop={8}
                >
                  <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                </Pressable>
              </View>
              {dayEntries.length === 0 ? (
                <Text style={[styles.emptyDay, { color: colors.textMuted }]}>
                  No meals planned — tap + to add
                </Text>
              ) : (
                dayEntries.map((entry) => (
                  <Pressable
                    key={entry.id}
                    onLongPress={() => removeEntry(entry)}
                    style={({ pressed }) => [
                      styles.entryRow,
                      { borderTopColor: colors.borderSubtle },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.slotTag, { backgroundColor: colors.overlay }]}>
                      <Text style={[styles.slotTagText, { color: colors.textMuted }]}>
                        {MEAL_SLOT_LABELS[entry.meal_slot]}
                      </Text>
                    </View>
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
          icon="star-outline"
          title="Save recipes first"
          subtitle="Star or save recipes on the Recipes tab, then assign them to your weekly plan."
        />
      ) : null}

      <Text style={[styles.hint, { color: colors.textMuted }]}>Long-press a meal to remove it.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
  },
  weekArrow: {
    padding: spacing.sm,
  },
  weekCenter: {
    flex: 1,
    alignItems: "center",
  },
  weekLabel: {
    ...typography.headline,
  },
  loadingWrap: {
    paddingVertical: spacing.xxxl,
    alignItems: "center",
  },
  loadingText: {
    ...typography.body,
  },
  todayCard: {
    borderWidth: 1.5,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dayTitle: {
    ...typography.headline,
  },
  todayBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  todayBadgeText: {
    ...typography.captionMedium,
    fontSize: 11,
    fontWeight: "700",
  },
  addButton: {
    padding: spacing.xs,
  },
  emptyDay: {
    ...typography.body,
    fontSize: 14,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  slotTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  slotTagText: {
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "600",
    fontSize: 11,
  },
  entryTitle: {
    ...typography.bodyMedium,
    flex: 1,
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
