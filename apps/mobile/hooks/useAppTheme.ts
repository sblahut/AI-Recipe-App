import { useColorScheme } from "react-native";

import {
  darkColors,
  lightColors,
  radius,
  spacing,
  typography,
  type ThemeColors,
} from "@/constants/theme";

export function useAppTheme(): {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  isDark: boolean;
} {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  return {
    colors: isDark ? darkColors : lightColors,
    spacing,
    radius,
    typography,
    isDark,
  };
}
