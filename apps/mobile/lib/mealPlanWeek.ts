export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

/** Local calendar day as YYYY-MM-DD. */
export function formatPlanDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parsePlanDateLocal(isoDate: string): Date {
  const parts = isoDate.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Monday on or before the given local date. */
export function mondayOnOrBefore(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  return addDays(date, -diff);
}

export function weekRangeFromWeekStart(weekStartMonday: Date): { start: string; end: string } {
  const endSunday = addDays(weekStartMonday, 6);
  return {
    start: formatPlanDate(weekStartMonday),
    end: formatPlanDate(endSunday),
  };
}

export function daysInWeek(weekStartMonday: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStartMonday, index));
}

export function weekdayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function mealSlotSortIndex(slot: string): number {
  const index = MEAL_SLOTS.indexOf(slot as MealSlot);
  return index >= 0 ? index : MEAL_SLOTS.length;
}
