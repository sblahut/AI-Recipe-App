import { Pressable, StyleSheet, Text } from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  capitalize?: boolean;
};

export function Chip({ label, selected = false, onPress, capitalize = true }: Props) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.primaryMuted : colors.overlay,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: selected ? colors.primary : colors.textSecondary },
          capitalize && styles.capitalize,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  text: {
    ...typography.captionMedium,
  },
  capitalize: {
    textTransform: "capitalize",
  },
});
