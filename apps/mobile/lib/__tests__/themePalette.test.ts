import {
  applyBrandColors,
  mixHex,
  normalizeHexColor,
  resolveThemeColors,
} from "@/lib/themePalette";
import { lightColors } from "@/constants/theme";

describe("normalizeHexColor", () => {
  it("accepts 6-digit hex with or without hash", () => {
    expect(normalizeHexColor("#c4563a")).toBe("#C4563A");
    expect(normalizeHexColor("c4563a")).toBe("#C4563A");
  });

  it("rejects invalid values", () => {
    expect(normalizeHexColor("orange")).toBeNull();
    expect(normalizeHexColor("#abc")).toBeNull();
  });
});

describe("mixHex", () => {
  it("returns an endpoint when ratio is 0 or 1", () => {
    expect(mixHex("#FF0000", "#0000FF", 1)).toBe("#FF0000");
    expect(mixHex("#FF0000", "#0000FF", 0)).toBe("#0000FF");
  });
});

describe("resolveThemeColors", () => {
  it("uses defaults when overrides are null", () => {
    const colors = resolveThemeColors(false, { primaryColor: null, accentColor: null });
    expect(colors.primary).toBe(lightColors.primary);
    expect(colors.accent).toBe(lightColors.accent);
  });

  it("applies custom primary and accent", () => {
    const colors = resolveThemeColors(false, {
      primaryColor: "#2563EB",
      accentColor: "#059669",
    });
    expect(colors.primary).toBe("#2563EB");
    expect(colors.accent).toBe("#059669");
    expect(colors.primaryMuted).not.toBe(lightColors.primaryMuted);
  });
});

describe("applyBrandColors", () => {
  it("keeps non-brand tokens from the base palette", () => {
    const next = applyBrandColors(lightColors, {
      primaryColor: "#2563EB",
      accentColor: null,
    });
    expect(next.background).toBe(lightColors.background);
    expect(next.danger).toBe(lightColors.danger);
  });
});
