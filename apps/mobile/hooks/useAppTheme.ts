import { useColorScheme } from "react-native";

import {
  darkColors,
  lightColors,
  radius,
  spacing,
  typography,
  type ThemeColors,
} from "@/constants/theme";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";

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
  return {
    colors: isDark ? darkColors : lightColors,
    spacing,
    radius,
    typography,
    isDark,
  };
}
