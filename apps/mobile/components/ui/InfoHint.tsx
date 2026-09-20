import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { elevatedShadow, radius, spacing, typography } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";

type Props = {
  message: string;
  title?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
};

export function InfoHint({
  message,
  title = "About this",
  accessibilityLabel = "More information",
  style,
  iconSize = 22,
}: Props) {
  const { colors } = useAppTheme();
  const [webPanelVisible, setWebPanelVisible] = useState(false);

  const isWeb = Platform.OS === "web";

  const openWebPanel = () => {
    setWebPanelVisible(true);
  };

  const closeWebPanel = () => {
    setWebPanelVisible(false);
  };

  const showDialog = () => {
    if (isWeb) {
      openWebPanel();
      return;
    }
    Alert.alert(title, message);
  };

  return (
    <>
      <View style={[styles.wrap, style]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={message}
          hitSlop={8}
          onPress={showDialog}
          {...(isWeb
            ? {
                onHoverIn: openWebPanel,
                onFocus: openWebPanel,
              }
            : {})}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="information-circle-outline" size={iconSize} color={colors.textMuted} />
        </Pressable>
      </View>

      {isWeb ? (
        <Modal
          visible={webPanelVisible}
          transparent
          animationType="fade"
          onRequestClose={closeWebPanel}
        >
          <Pressable style={styles.webBackdrop} onPress={closeWebPanel}>
            <Pressable
              style={[
                styles.webPanel,
                elevatedShadow(),
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.webTitle, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.webMessage, { color: colors.textSecondary }]}>{message}</Text>
              <AppButton label="Got it" variant="secondary" compact onPress={closeWebPanel} />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  webBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: "rgba(45, 36, 32, 0.45)",
  },
  webPanel: {
    width: "100%",
    maxWidth: 440,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    gap: spacing.md,
  },
  webTitle: {
    ...typography.headline,
  },
  webMessage: {
    ...typography.body,
    lineHeight: 24,
  },
});
