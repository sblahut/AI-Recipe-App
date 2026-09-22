import type { TextSizePreference } from "@/lib/userPreferences";
import { typography } from "@/constants/theme";
import type { TextStyle } from "react-native";

const SCALE: Record<TextSizePreference, number> = {
  small: 0.92,
  default: 1,
  large: 1.12,
};

function scaleTextStyle(style: TextStyle, factor: number): TextStyle {
  const next: TextStyle = { ...style };
  if (typeof next.fontSize === "number") {
    next.fontSize = Math.round(next.fontSize * factor);
  }
  if (typeof next.lineHeight === "number") {
    next.lineHeight = Math.round(next.lineHeight * factor);
  }
  return next;
}

export function scaledTypography(size: TextSizePreference): typeof typography {
  const factor = SCALE[size] ?? 1;
  const entries = Object.entries(typography).map(([key, style]) => [
    key,
    scaleTextStyle(style, factor),
  ]);
  return Object.fromEntries(entries) as typeof typography;
}
