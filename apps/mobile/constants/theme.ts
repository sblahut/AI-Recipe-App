import { Platform, type TextStyle, type ViewStyle } from "react-native";

/* ────────────────────────────────────────────────────────────
   Color tokens
   ────────────────────────────────────────────────────────── */

export type ThemeColors = {
  /** App background — warm cream (light) or warm charcoal (dark). */
  background: string;
  /** Card / input background. */
  surface: string;
  /** Elevated surface — modals, popovers. */
  surfaceElevated: string;
  /** Primary border — cards, inputs, dividers. */
  border: string;
  /** Very subtle border — section separators. */
  borderSubtle: string;

  text: string;
  textSecondary: string;
  textMuted: string;

  /** Warm terracotta — hero action color. */
  primary: string;
  /** Very soft tint of primary — selected chips, tags, highlights. */
  primaryMuted: string;
  /** Text/icon on primary-colored backgrounds. */
  onPrimary: string;

  /** Sage green — secondary prominent actions (scan, shop, stock). */
  accent: string;
  accentMuted: string;
  onAccent: string;

  danger: string;
  dangerMuted: string;
  success: string;
  successMuted: string;

  /** Soft butter — inline highlights, badges. */
  highlight: string;

  tabBar: string;
  tabBarBorder: string;
  tabInactive: string;

  overlay: string;
};

export const lightColors: ThemeColors = {
  background: "#FAF8F4",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  border: "#E8E1D5",
  borderSubtle: "#F0EBE3",

  text: "#2D2420",
  textSecondary: "#5C524A",
  textMuted: "#8C827A",

  primary: "#C4563A",
  primaryMuted: "#FBF0EC",
  onPrimary: "#FFFFFF",

  accent: "#5C7C4E",
  accentMuted: "#ECF1E8",
  onAccent: "#FFFFFF",

  danger: "#C53030",
  dangerMuted: "#FEF2F2",
  success: "#2F855A",
  successMuted: "#F0FFF4",

  highlight: "#FEF7E7",

  tabBar: "#FFFFFF",
  tabBarBorder: "#E8E1D5",
  tabInactive: "#B0A89E",

  overlay: "rgba(45, 36, 32, 0.04)",
};

export const darkColors: ThemeColors = {
  background: "#1A1614",
  surface: "#2A2420",
  surfaceElevated: "#342E28",
  border: "#4A4138",
  borderSubtle: "#3A332C",

  text: "#F5F0EB",
  textSecondary: "#D4CCC4",
  textMuted: "#9A918A",

  primary: "#E07755",
  primaryMuted: "#3D2520",
  onPrimary: "#FFFFFF",

  accent: "#7FA370",
  accentMuted: "#1E2C18",
  onAccent: "#FFFFFF",

  danger: "#F87171",
  dangerMuted: "#3B1818",
  success: "#48BB78",
  successMuted: "#1A3329",

  highlight: "#3D3520",

  tabBar: "#2A2420",
  tabBarBorder: "#4A4138",
  tabInactive: "#78706A",

  overlay: "rgba(245, 240, 235, 0.06)",
};

/* ────────────────────────────────────────────────────────────
   Spacing scale
   ────────────────────────────────────────────────────────── */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/* ────────────────────────────────────────────────────────────
   Border radius
   ────────────────────────────────────────────────────────── */

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/* ────────────────────────────────────────────────────────────
   Typography scale — editorial + functional
   ────────────────────────────────────────────────────────── */

export const typography = {
  /** Hero headers — recipe feature, pantry greeting. */
  display: {
    fontSize: 28,
    fontWeight: "700" as const,
    letterSpacing: -0.6,
  },
  /** Screen-level titles. */
  h1: {
    fontSize: 24,
    fontWeight: "700" as const,
    letterSpacing: -0.4,
  },
  /** Section titles (alias kept for backward compat). */
  title: {
    fontSize: 20,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  /** Card titles, inline headings. */
  headline: {
    fontSize: 17,
    fontWeight: "600" as const,
  },
  /** Default body text. */
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  /** Emphasized body text. */
  bodyMedium: {
    fontSize: 16,
    fontWeight: "500" as const,
    lineHeight: 24,
  },
  /** Small metadata, timestamps. */
  caption: {
    fontSize: 13,
    fontWeight: "400" as const,
  },
  /** Emphasized captions — filter labels, badges. */
  captionMedium: {
    fontSize: 13,
    fontWeight: "500" as const,
  },
  /** Form labels, settings labels. */
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  /** Button text. */
  button: {
    fontSize: 15,
    fontWeight: "600" as const,
    letterSpacing: 0.15,
  },
} satisfies Record<string, TextStyle>;

/* ────────────────────────────────────────────────────────────
   Elevation helpers
   ────────────────────────────────────────────────────────── */

/** Subtle card shadow — default resting state. */
export function cardShadow(): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: "#2D2420",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
    },
    android: { elevation: 1 },
    default: {},
  });
}

/** More prominent shadow — modals, focused elements. */
export function elevatedShadow(): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: "#2D2420",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    android: { elevation: 4 },
    default: {},
  });
}
