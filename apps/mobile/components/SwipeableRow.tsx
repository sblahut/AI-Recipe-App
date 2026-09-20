import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import { radius, spacing, typography } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";

type Props = {
  children: ReactNode;
  onDelete: () => void;
  enabled?: boolean;
  label?: string;
};

export function SwipeableRow({ children, onDelete, enabled = true, label = "Delete" }: Props) {
  const { colors } = useAppTheme();
  const canSwipe = enabled && Platform.OS !== "web";

  if (!canSwipe) {
    return children;
  }

  return (
    <Swipeable
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onDelete}
          style={[styles.action, { backgroundColor: colors.danger }]}
        >
          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
          <Text style={styles.actionLabel}>{label}</Text>
        </Pressable>
      )}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: 80,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  actionLabel: {
    ...typography.caption,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
