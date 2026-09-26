import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { InfoHint } from "@/components/ui/InfoHint";
import { Screen } from "@/components/ui/Screen";
import { radius, spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  resolveDefaultShoppingList,
  skipPantryCheckFromPreferences,
} from "@/lib/shoppingListTarget";
import { apiFetch, apiJson } from "@/lib/api";
import { saveCustomMealRecipeTitle } from "@/lib/mealPlanCustomMeal";
import {
  mealPlanShopAlertMessage,
  mealPlanShopAlertTitle,
  mealPlanShopResultFromApi,
} from "@/lib/shoppingFromMealPlanAlert";
import { MEAL_PLAN_SHOP_WEEK_HINT } from "@/lib/uiActionLabels";
import {
  MEAL_SLOT_LABELS,
  MEAL_SLOTS,
  type MealSlot,
  addDays,
  daysInWeek,
  formatPlanDate,
  mealSlotSortIndex,
  weekStartOnOrBefore,
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
  const insets = useSafeAreaInsets();
  const { serverUrl } = useServerSettings();
  const { preferences } = useUserPreferences();
  const weekStartsOnDay = preferences.weekStartsOnDay ?? 1;
  const weekStartBase = useMemo(
    () => weekStartOnOrBefore(new Date(), weekStartsOnDay),
    [weekStartsOnDay],
  );
  const [weekOffsetDays, setWeekOffsetDays] = useState(0);
  const weekStart = useMemo(
    () => addDays(weekStartBase, weekOffsetDays),
    [weekStartBase, weekOffsetDays],
  );
  const [entries, setEntries] = useState<MealPlanEntry[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopLoading, setShopLoading] = useState(false);
  const [customMealTarget, setCustomMealTarget] = useState<{
    planDate: string;
    mealSlot: MealSlot;
  } | null>(null);
  const [customMealTitle, setCustomMealTitle] = useState("");
  const [customMealSaving, setCustomMealSaving] = useState(false);

  const weekRange = useMemo(() => weekRangeFromWeekStart(weekStart), [weekStart]);
  const weekDays = useMemo(() => daysInWeek(weekStart), [weekStart]);

  useEffect(() => {
    queueMicrotask(() => {
      setWeekOffsetDays(0);
    });
  }, [weekStartsOnDay]);

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

  const addMealPlanEntry = async (
    planDate: string,
    mealSlot: MealSlot,
    savedRecipeId: number,
  ) => {
    await apiFetch("/meal-plan", {
      baseUrl: serverUrl,
      method: "POST",
      body: JSON.stringify({
        plan_date: planDate,
        meal_slot: mealSlot,
        saved_recipe_id: savedRecipeId,
      }),
    });
    await loadPlan();
  };

  const openCustomMealModal = (planDate: string, mealSlot: MealSlot) => {
    setCustomMealTitle("");
    setCustomMealTarget({ planDate, mealSlot });
  };

  const closeCustomMealModal = () => {
    if (customMealSaving) {
      return;
    }
    setCustomMealTarget(null);
    setCustomMealTitle("");
  };

  const submitCustomMeal = () => {
    if (!customMealTarget) {
      return;
    }
    const { planDate, mealSlot } = customMealTarget;
    setCustomMealSaving(true);
    void (async () => {
      try {
        const savedRecipeId = await saveCustomMealRecipeTitle(customMealTitle, serverUrl);
        await addMealPlanEntry(planDate, mealSlot, savedRecipeId);
        setCustomMealTarget(null);
        setCustomMealTitle("");
      } catch (e) {
        Alert.alert("Add meal", e instanceof Error ? e.message : "Could not add meal");
      } finally {
        setCustomMealSaving(false);
      }
    })();
  };

  const pickRecipeAndAdd = (planDate: string, mealSlot: MealSlot) => {
    const favoriteRecipes = savedRecipes.filter((row) => row.favorite);
    const recipeOptions = favoriteRecipes.length > 0 ? favoriteRecipes : savedRecipes;

    Alert.alert(
      MEAL_SLOT_LABELS[mealSlot],
      `Add a meal for ${planDate}`,
      [
        {
          text: "Meal Not in Favorites",
          onPress: () => openCustomMealModal(planDate, mealSlot),
        },
        ...recipeOptions.map((row) => ({
          text: row.title,
          onPress: () => {
            void (async () => {
              try {
                await addMealPlanEntry(planDate, mealSlot, row.id);
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

  const runShopForWeek = (list: ShoppingList) => {
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
            skip_pantry_check: skipPantryCheckFromPreferences(preferences),
          }),
        });
        const result = shoppingFromMealPlanResponseSchema.parse(raw);
        const summary = mealPlanShopResultFromApi(result);
        Alert.alert(mealPlanShopAlertTitle(summary), mealPlanShopAlertMessage(summary, list.name));
      } catch (e) {
        Alert.alert(
          "Shopping list",
          e instanceof Error ? e.message : "Could not update shopping list",
        );
      } finally {
        setShopLoading(false);
      }
    })();
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
    const defaultList = resolveDefaultShoppingList(lists, preferences);
    if (defaultList) {
      runShopForWeek(defaultList);
      return;
    }
    Alert.alert(
      "Shop for this week",
      "Choose which list to add missing groceries to. Items you already have won't be duplicated.",
      [
        ...lists.map((list) => ({
          text: list.name,
          onPress: () => runShopForWeek(list),
        })),
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const today = formatPlanDate(new Date());

  return (
    <Screen scroll contentContainerStyle={styles.scroll}>
      <Modal
        visible={customMealTarget != null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeCustomMealModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[
            styles.customMealModal,
            {
              backgroundColor: colors.background,
              paddingTop: insets.top + spacing.lg,
            },
          ]}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        >
          <Text style={[styles.customMealHeading, { color: colors.text }]}>Meal Not in Favorites</Text>
          {customMealTarget ? (
            <Text style={[styles.customMealSub, { color: colors.textMuted }]}>
              {customMealTarget.planDate} · {MEAL_SLOT_LABELS[customMealTarget.mealSlot]}
            </Text>
          ) : null}
          <AppTextField
            label="Meal name"
            placeholder="e.g. Pizza night, leftovers, tacos…"
            value={customMealTitle}
            onChangeText={setCustomMealTitle}
            autoFocus
          />
          <View style={styles.customMealActions}>
            <AppButton
              label="Cancel"
              variant="ghost"
              onPress={closeCustomMealModal}
              disabled={customMealSaving}
            />
            <AppButton
              label={customMealSaving ? "Saving…" : "Add to plan"}
              loading={customMealSaving}
              onPress={submitCustomMeal}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Week navigation */}
      <View style={styles.weekNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          onPress={() => setWeekOffsetDays((current) => current - 7)}
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
          onPress={() => setWeekOffsetDays((current) => current + 7)}
          style={({ pressed }) => [styles.weekArrow, pressed && styles.pressed]}
          hitSlop={12}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.shopWeekRow}>
        <View style={styles.shopWeekButtonWrap}>
          <AppButton
            label={shopLoading ? "Adding groceries…" : "Shop for this week"}
            variant="accent"
            loading={shopLoading}
            onPress={shopThisWeek}
          />
        </View>
        <InfoHint
          title="Shop for this week"
          message={MEAL_PLAN_SHOP_WEEK_HINT}
          accessibilityLabel="About Shop for this week"
        />
      </View>

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
          title="No saved recipes yet"
          subtitle="Tap + on a day and choose Meal Not in Favorites, or star recipes on the Recipes tab to pick them here."
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
  shopWeekRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  shopWeekButtonWrap: {
    flex: 1,
    minWidth: 0,
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
  customMealModal: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
    justifyContent: "flex-start",
  },
  customMealHeading: {
    ...typography.title,
  },
  customMealSub: {
    ...typography.caption,
  },
  customMealActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  pressed: {
    opacity: 0.7,
  },
});
