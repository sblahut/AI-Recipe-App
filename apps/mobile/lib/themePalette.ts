import { darkColors, lightColors, type ThemeColors } from "@/constants/theme";

export const DEFAULT_THEME_PRIMARY = {
  light: lightColors.primary,
  dark: darkColors.primary,
} as const;

export const DEFAULT_THEME_ACCENT = {
  light: lightColors.accent,
  dark: darkColors.accent,
} as const;

export type BrandColorOverrides = {
  primaryColor: string | null | undefined;
  accentColor: string | null | undefined;
};

type Rgb = { r: number; g: number; b: number };

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  const match = /^#?([0-9A-Fa-f]{6})$/.exec(trimmed);
  if (!match?.[1]) {
    return null;
  }
  return `#${match[1].toUpperCase()}`;
}

function parseHex(hex: string): Rgb {
  const normalized = normalizeHexColor(hex);
  if (!normalized) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const raw = normalized.slice(1);
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }: Rgb): string {
  const clamp = (n: number) => Math.min(255, Math.max(0, Math.round(n)));
  const part = (n: number) => clamp(n).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

/** Blend two hex colors; `ratio` is the weight of `colorA` (0–1). */
export function mixHex(colorA: string, colorB: string, ratio: number): string {
  const a = parseHex(colorA);
  const b = parseHex(colorB);
  const t = Math.min(1, Math.max(0, ratio));
  return toHex({
    r: a.r * t + b.r * (1 - t),
    g: a.g * t + b.g * (1 - t),
    b: a.b * t + b.b * (1 - t),
  });
}

/** WCAG-style relative luminance for sRGB hex. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastingTextColor(backgroundHex: string): string {
  return relativeLuminance(backgroundHex) > 0.45 ? "#2D2420" : "#FFFFFF";
}

export function applyBrandColors(base: ThemeColors, overrides: BrandColorOverrides): ThemeColors {
  const primary = normalizeHexColor(overrides.primaryColor ?? "") ?? base.primary;
  const accent = normalizeHexColor(overrides.accentColor ?? "") ?? base.accent;

  const isDarkBase = base.background === darkColors.background;
  const mutedPrimaryRatio = isDarkBase ? 0.22 : 0.1;
  const mutedAccentRatio = isDarkBase ? 0.22 : 0.1;

  return {
    ...base,
    primary,
    accent,
    primaryMuted: mixHex(primary, base.background, mutedPrimaryRatio),
    accentMuted: mixHex(accent, base.background, mutedAccentRatio),
    onPrimary: contrastingTextColor(primary),
    onAccent: contrastingTextColor(accent),
  };
}

export function resolveThemeColors(isDark: boolean, overrides: BrandColorOverrides): ThemeColors {
  const base = isDark ? darkColors : lightColors;
  return applyBrandColors(base, overrides);
}

/** Quick-pick swatches for the appearance settings picker. */
export const PRIMARY_COLOR_PRESETS = [
  "#C4563A",
  "#E07755",
  "#D97706",
  "#CA8A04",
  "#DC2626",
  "#DB2777",
  "#C026D3",
  "#9333EA",
  "#2563EB",
  "#0891B2",
  "#0D9488",
  "#059669",
  "#78716C",
  "#44403C",
] as const;

export const ACCENT_COLOR_PRESETS = [
  "#5C7C4E",
  "#7FA370",
  "#2F855A",
  "#48BB78",
  "#15803D",
  "#0F766E",
  "#0369A1",
  "#4F46E5",
  "#7C3AED",
  "#BE185D",
  "#B45309",
  "#A16207",
  "#57534E",
  "#334155",
] as const;
