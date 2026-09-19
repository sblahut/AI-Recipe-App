import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ComponentProps } from "react";

import { radius, spacing, typography } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

type Props = {
  label: string;
  icon: IoniconName;
  selected: boolean;
  onPress: () => void;
  count?: number;
};

export function StorageFilterOption({ label, icon, selected, onPress, count }: Props) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected ? colors.primaryMuted : "transparent",
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <View style={styles.pill}>
        <Ionicons
          name={icon}
          size={18}
          color={selected ? colors.primary : colors.textMuted}
        />
        <Text
          style={[
            styles.label,
            { color: selected ? colors.primary : colors.textSecondary },
          ]}
        >
          {label}
        </Text>
        {count != null ? (
          <Text style={[styles.count, { color: colors.textMuted }]}>{count}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  label: {
    ...typography.caption,
    fontWeight: "600",
  },
  count: {
    ...typography.caption,
    fontWeight: "500",
  },
});
