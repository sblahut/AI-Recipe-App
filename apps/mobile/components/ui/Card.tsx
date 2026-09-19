import { StyleSheet, View, type ViewProps } from "react-native";

import { cardShadow, radius, spacing } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";

type Props = ViewProps & {
  padded?: boolean;
};

export function Card({ style, padded = true, children, ...rest }: Props) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        cardShadow(),
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        padded && styles.padded,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  padded: {
    padding: spacing.lg,
  },
});
