import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import type { ComponentProps } from "react";

import { spacing, typography } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

type Props = {
  title: string;
  subtitle?: string;
  icon?: IoniconName;
};

export function EmptyState({ title, subtitle, icon }: Props) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.wrap}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: colors.overlay }]}>
          <Ionicons name={icon} size={28} color={colors.textMuted} />
        </View>
      ) : null}
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.bodyMedium,
    textAlign: "center",
  },
  subtitle: {
    ...typography.caption,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
});
