import {
  addDays,
  daysInWeek,
  formatPlanDate,
  formatWeekRangeLabel,
  mealSlotSortIndex,
  mondayOnOrBefore,
  parsePlanDateLocal,
  weekRangeFromWeekStart,
  weekStartOnOrBefore,
} from "@/lib/mealPlanWeek";

describe("mealPlanWeek", () => {
  it("formats and parses plan dates in local time", () => {
    const date = new Date(2026, 3, 7);
    expect(formatPlanDate(date)).toBe("2026-04-07");
    const roundTrip = parsePlanDateLocal("2026-04-07");
    expect(roundTrip.getFullYear()).toBe(2026);
    expect(roundTrip.getMonth()).toBe(3);
    expect(roundTrip.getDate()).toBe(7);
  });

  it("finds Monday on or before a Wednesday", () => {
    const wed = new Date(2026, 3, 8);
    const mon = mondayOnOrBefore(wed);
    expect(formatPlanDate(mon)).toBe("2026-04-06");
  });

  it("finds Sunday on or before when week starts Sunday", () => {
    const wed = new Date(2026, 3, 8);
    const sun = weekStartOnOrBefore(wed, 0);
    expect(formatPlanDate(sun)).toBe("2026-04-05");
  });

  it("builds a seven-day week range", () => {
    const mon = parsePlanDateLocal("2026-04-06");
    expect(weekRangeFromWeekStart(mon)).toEqual({ start: "2026-04-06", end: "2026-04-12" });
    expect(daysInWeek(mon)).toHaveLength(7);
    expect(formatPlanDate(daysInWeek(mon)[6] ?? mon)).toBe("2026-04-12");
  });

  it("adds days across month boundaries", () => {
    const start = parsePlanDateLocal("2026-04-30");
    expect(formatPlanDate(addDays(start, 1))).toBe("2026-05-01");
  });

  it("orders meal slots", () => {
    expect(mealSlotSortIndex("breakfast")).toBeLessThan(mealSlotSortIndex("dinner"));
  });

  it("formats week range label", () => {
    const mon = parsePlanDateLocal("2026-04-06");
    expect(formatWeekRangeLabel(mon)).toBe("2026-04-06 – 2026-04-12");
  });
});
