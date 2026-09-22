import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ThemeColors } from "@/constants/theme";
import { radius, spacing, typography } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useHomeServerReady } from "@/hooks/useHomeServerReady";

export function HomeServerStatusCard() {
  const { colors } = useAppTheme();
  const { ready, refresh } = useHomeServerReady();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <ReadyLine
        ok={ready.serverOk}
        colors={colors}
        label={ready.serverOk ? "Home server connected" : "Home server offline"}
      />
      <ReadyLine
        ok={ready.ollamaOk === true}
        colors={colors}
        label={
          ready.ollamaOk === true
            ? "AI model ready"
            : ready.ollamaOk === false
              ? "AI model offline"
              : "AI model status unknown"
        }
      />
      <ReadyLine
        ok={ready.ingredientCount > 0}
        colors={colors}
        label={
          ready.ingredientCount > 0
            ? `${ready.ingredientCount} ingredient${ready.ingredientCount === 1 ? "" : "s"} available`
            : "Add ingredients on the Pantry tab"
        }
      />
    </View>
  );
}

function ReadyLine({ ok, label, colors }: { ok: boolean; label: string; colors: ThemeColors }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: ok ? colors.success : colors.textMuted }]} />
      <Text style={[styles.label, { color: ok ? colors.text : colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    ...typography.caption,
    flex: 1,
  },
});
