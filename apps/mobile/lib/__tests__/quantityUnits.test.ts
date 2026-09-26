import {
  defaultUnitsByKind,
  formatUnitLabel,
  mergeQuantityUnitsFromApi,
  unitsForKind,
} from "@/lib/quantityUnits";

describe("quantityUnits", () => {
  it("formats known unit labels", () => {
    expect(formatUnitLabel("ml")).toBe("mL");
    expect(formatUnitLabel("fl_oz")).toBe("fl oz");
    expect(formatUnitLabel("each")).toBe("each");
  });

  it("returns default units per kind", () => {
    const defaults = defaultUnitsByKind();
    expect(defaults.count).toContain("each");
    expect(defaults.weight).toContain("g");
    expect(defaults.volume).toContain("cup");
  });

  it("merges API units with canonical defaults", () => {
    const merged = mergeQuantityUnitsFromApi({ count: ["jar"] });
    expect(merged.count).toContain("each");
    expect(merged.count).toContain("jar");
  });

  it("orders units with canonical first and keeps selected unit", () => {
    const fromApi = { count: ["jar"], weight: [], volume: [] };
    const units = unitsForKind("count", fromApi, "crate");
    expect(units[0]).toBe("each");
    expect(units).toContain("jar");
    expect(units).toContain("crate");
  });
});
