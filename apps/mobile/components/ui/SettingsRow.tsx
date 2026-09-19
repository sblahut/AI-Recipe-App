import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { spacing, typography } from "@/constants/theme";
import type { ThemeColors } from "@/constants/theme";

type SettingsRowProps = {
  colors: ThemeColors;
  label: string;
  hint?: string;
  value?: boolean;
  onValueChange?: (next: boolean) => void;
  disabled?: boolean;
};

/** Label + optional hint with a trailing switch (common settings pattern). */
export function SettingsSwitchRow({
  colors,
  label,
  hint,
  value = false,
  onValueChange,
  disabled,
}: SettingsRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primaryMuted }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

type SettingsLinkRowProps = {
  colors: ThemeColors;
  label: string;
  hint?: string;
  onPress: () => void;
};

export function SettingsLinkRow({ colors, label, hint, onPress }: SettingsLinkRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
    >
      <View style={styles.textBlock}>
        <Text style={[styles.label, { color: colors.primary }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  textBlock: { flex: 1, gap: 2 },
  label: typography.body,
  hint: { ...typography.caption, lineHeight: 18 },
});
