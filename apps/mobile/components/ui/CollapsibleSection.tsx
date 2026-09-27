import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { spacing, typography } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";

type Props = {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  leadingIcon?: keyof typeof Ionicons.glyphMap;
  onHeaderLongPress?: () => void;
};

export function CollapsibleSection({
  title,
  expanded,
  onToggle,
  children,
  leadingIcon,
  onHeaderLongPress,
}: Props) {
  const { colors } = useAppTheme();

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        onLongPress={onHeaderLongPress}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <View style={styles.titleRow}>
          {leadingIcon ? <Ionicons name={leadingIcon} size={20} color={colors.primary} /> : null}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.textMuted}
        />
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: { ...typography.headline, flex: 1 },
  body: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  pressed: { opacity: 0.8 },
});
