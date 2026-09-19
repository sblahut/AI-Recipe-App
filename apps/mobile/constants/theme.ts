import { Platform, type TextStyle, type ViewStyle } from "react-native";

export type ThemeColors = {
  background: string;
  surface: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryMuted: string;
  onPrimary: string;
  accent: string;
  accentMuted: string;
  onAccent: string;
  danger: string;
  success: string;
  tabBar: string;
  tabBarBorder: string;
  tabInactive: string;
  overlay: string;
};

export const lightColors: ThemeColors = {
  background: "#F7F5F0",
  surface: "#FFFFFF",
  border: "#E8E4DC",
  text: "#1C1917",
  textSecondary: "#44403C",
  textMuted: "#78716C",
  primary: "#7C3AED",
  primaryMuted: "#EDE9FE",
  onPrimary: "#FFFFFF",
  accent: "#FFA726",
  accentMuted: "#FFF3E0",
  onAccent: "#1C1917",
  danger: "#DC2626",
  success: "#15803D",
  tabBar: "#FFFFFF",
  tabBarBorder: "#E8E4DC",
  tabInactive: "#A8A29E",
  overlay: "rgba(28, 25, 23, 0.04)",
};

export const darkColors: ThemeColors = {
  background: "#1C1917",
  surface: "#292524",
  border: "#44403C",
  text: "#FAFAF9",
  textSecondary: "#D6D3D1",
  textMuted: "#A8A29E",
  primary: "#A855F7",
  primaryMuted: "#4C1D95",
  onPrimary: "#FFFFFF",
  accent: "#FFA726",
  accentMuted: "#7C2D12",
  onAccent: "#1C1917",
  danger: "#F87171",
  success: "#22C55E",
  tabBar: "#292524",
  tabBarBorder: "#44403C",
  tabInactive: "#78716C",
  overlay: "rgba(255, 255, 255, 0.06)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 20, fontWeight: "700" as const, letterSpacing: -0.3 },
  headline: { fontSize: 17, fontWeight: "600" as const },
  body: { fontSize: 16, fontWeight: "400" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
  label: { fontSize: 14, fontWeight: "600" as const },
} satisfies Record<string, TextStyle>;

export function cardShadow(): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: "#1C1917",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
    },
    android: { elevation: 2 },
    default: {},
  });
}
