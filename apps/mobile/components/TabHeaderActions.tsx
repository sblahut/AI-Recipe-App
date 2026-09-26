import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useAppTheme } from "@/hooks/useAppTheme";
import { useHomeServerReady } from "@/hooks/useHomeServerReady";
import { homeServerHeaderStatus, type HomeServerHeaderTone } from "@/lib/homeServerReady";

function statusDotColor(
  tone: HomeServerHeaderTone,
  colors: { accent: string; primary: string; danger: string },
): string {
  if (tone === "ok") {
    return colors.accent;
  }
  if (tone === "ollama_down") {
    return colors.primary;
  }
  return colors.danger;
}

export function TabHeaderActions() {
  const { colors } = useAppTheme();
  const pathname = usePathname();
  const { ready, refresh } = useHomeServerReady();
  const status = homeServerHeaderStatus(ready);

  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        hitSlop={8}
        onPress={() => {
          router.push({ pathname: "/settings", params: { section: "menu" } });
        }}
        style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
      >
        <Ionicons name="settings-outline" size={24} color={colors.primary} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={status.accessibilityLabel}
        hitSlop={8}
        onPress={() => {
          router.push({ pathname: "/settings", params: { section: "about" } });
        }}
        style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
      >
        <View
          style={[
            styles.dot,
            {
              backgroundColor: statusDotColor(status.tone, colors),
              borderColor: colors.tabBar,
            },
          ]}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  hit: {
    minWidth: 36,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
});
