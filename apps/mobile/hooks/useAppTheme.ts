import { useColorScheme } from "react-native";

import { radius, spacing, typography, type ThemeColors } from "@/constants/theme";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { resolveThemeColors } from "@/lib/themePalette";
import { scaledTypography } from "@/lib/textScale";

export function useAppTheme(): {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  isDark: boolean;
} {
  const systemScheme = useColorScheme();
  const { preferences } = useUserPreferences();
  const mode = preferences.themeMode ?? "system";
  const isDark =
    mode === "dark" || (mode === "system" && systemScheme === "dark");
  const colors = resolveThemeColors(isDark, {
    primaryColor: preferences.primaryColor,
    accentColor: preferences.accentColor,
  });

  const textSize = preferences.textSize ?? "default";

  return {
    colors,
    spacing,
    radius,
    typography: scaledTypography(textSize),
    isDark,
  };
}
