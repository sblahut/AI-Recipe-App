import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { DismissibleModal } from "@/components/ui/DismissibleModal";
import { spacing, typography } from "@/constants/theme";
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
  const [panelVisible, setPanelVisible] = useState(false);

  const openPanel = () => {
    setPanelVisible(true);
  };

  const closePanel = () => {
    setPanelVisible(false);
  };

  return (
    <>
      <View style={[styles.wrap, style]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={message}
          hitSlop={8}
          onPress={openPanel}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="information-circle-outline" size={iconSize} color={colors.textMuted} />
        </Pressable>
      </View>

      <DismissibleModal visible={panelVisible} onClose={closePanel} variant="center">
        <Text style={[styles.panelTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.panelMessage, { color: colors.textSecondary }]}>{message}</Text>
        <AppButton label="Got it" variant="secondary" compact onPress={closePanel} />
      </DismissibleModal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  panelTitle: {
    ...typography.headline,
  },
  panelMessage: {
    ...typography.body,
    lineHeight: 24,
  },
});
