import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";

type Variant = "primary" | "secondary" | "ghost" | "accent";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  compact?: boolean;
};

export function AppButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
  compact = false,
}: Props) {
  const { colors } = useAppTheme();
  const isDisabled = disabled || loading;

  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "accent"
        ? colors.accent
        : variant === "secondary"
          ? colors.overlay
          : "transparent";

  const textColor =
    variant === "primary"
      ? colors.onPrimary
      : variant === "accent"
        ? colors.onAccent
        : variant === "secondary"
          ? colors.text
          : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact ? styles.compact : styles.default,
        { backgroundColor: bg, opacity: pressed && !isDisabled ? 0.88 : 1 },
        variant === "ghost" && styles.ghost,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  default: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  compact: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 40,
  },
  ghost: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.label,
  },
});
