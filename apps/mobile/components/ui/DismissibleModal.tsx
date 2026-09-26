import type { ReactNode } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { elevatedShadow, radius, spacing } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";

export const MODAL_BACKDROP_COLOR = "rgba(45, 36, 32, 0.45)";

export type DismissibleModalVariant = "center" | "bottomSheet";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  variant?: DismissibleModalVariant;
  sheetStyle?: StyleProp<ViewStyle>;
  animationType?: "none" | "slide" | "fade";
};

export function DismissibleModal({
  visible,
  onClose,
  children,
  variant = "center",
  sheetStyle,
  animationType,
}: Props) {
  const { colors } = useAppTheme();
  const resolvedAnimation =
    animationType ?? (variant === "bottomSheet" ? "slide" : "fade");

  return (
    <Modal
      visible={visible}
      transparent
      animationType={resolvedAnimation}
      onRequestClose={onClose}
    >
      {variant === "bottomSheet" ? (
        <View style={[styles.fill, { backgroundColor: MODAL_BACKDROP_COLOR }]}>
          <Pressable
            style={styles.dismissArea}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
          />
          <View
            style={[
              styles.bottomSheet,
              { backgroundColor: colors.background, borderColor: colors.border },
              sheetStyle,
            ]}
          >
            {children}
          </View>
        </View>
      ) : (
        <Pressable
          style={[styles.fill, styles.centerBackdrop, { backgroundColor: MODAL_BACKDROP_COLOR }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss dialog"
        >
          <Pressable
            style={[
              styles.centerPanel,
              elevatedShadow(),
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
              sheetStyle,
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {children}
          </Pressable>
        </Pressable>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  dismissArea: {
    flex: 1,
  },
  centerBackdrop: {
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  centerPanel: {
    width: "100%",
    maxWidth: 440,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    gap: spacing.md,
  },
  bottomSheet: {
    width: "100%",
    maxHeight: "92%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
});
