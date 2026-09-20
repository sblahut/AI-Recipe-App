import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";

type Props = {
  message: string;
  title?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function InfoHint({
  message,
  title = "About this",
  accessibilityLabel = "More information",
  style,
}: Props) {
  const { colors } = useAppTheme();
  const [webTooltipVisible, setWebTooltipVisible] = useState(false);

  const showDialog = () => {
    Alert.alert(title, message);
  };

  const isWeb = Platform.OS === "web";

  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={message}
        hitSlop={10}
        onPress={showDialog}
        {...(isWeb
          ? {
              onHoverIn: () => setWebTooltipVisible(true),
              onHoverOut: () => setWebTooltipVisible(false),
              onFocus: () => setWebTooltipVisible(true),
              onBlur: () => setWebTooltipVisible(false),
            }
          : {})}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      >
        <Ionicons name="information-circle-outline" size={22} color={colors.textMuted} />
      </Pressable>
      {isWeb && webTooltipVisible ? (
        <View
          style={[
            styles.tooltip,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.tooltipText, { color: colors.textSecondary }]}>{message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  tooltip: {
    position: "absolute",
    bottom: "100%",
    right: 0,
    marginBottom: spacing.xs,
    maxWidth: 280,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: {
        boxShadow: "0 4px 12px rgba(45, 36, 32, 0.12)",
      },
      default: {},
    }),
  },
  tooltipText: {
    ...typography.caption,
    lineHeight: 18,
  },
});
