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
  onLongPress?: () => void;
  count?: number;
};

export function StorageFilterOption({
  label,
  icon,
  selected,
  onPress,
  onLongPress,
  count,
}: Props) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected ? colors.primaryMuted : "transparent",
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <View style={styles.pill}>
        <Ionicons
          name={icon}
          size={17}
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
          <Text
            style={[
              styles.count,
              { color: selected ? colors.primary : colors.textMuted },
            ]}
          >
            {count}
          </Text>
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
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  label: {
    ...typography.captionMedium,
  },
  count: {
    ...typography.caption,
  },
});
