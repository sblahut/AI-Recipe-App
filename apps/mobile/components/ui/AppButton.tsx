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
          ? colors.surface
          : "transparent";

  const textColor =
    variant === "primary"
      ? colors.onPrimary
      : variant === "accent"
        ? colors.onAccent
        : variant === "secondary"
          ? colors.text
          : colors.primary;

  const borderColor =
    variant === "secondary" ? colors.border : "transparent";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact ? styles.compact : styles.default,
        {
          backgroundColor: bg,
          borderColor,
          opacity: isDisabled ? 0.45 : pressed ? 0.82 : 1,
        },
        variant === "ghost" && styles.ghost,
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
    borderWidth: 1,
    borderColor: "transparent",
  },
  default: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 50,
  },
  compact: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 42,
  },
  ghost: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 0,
  },
  label: {
    ...typography.button,
  },
});
