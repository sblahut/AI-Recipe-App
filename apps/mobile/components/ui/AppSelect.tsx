import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { elevatedShadow, radius, spacing, typography } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";

export type AppSelectOption<T extends string | number> = {
  value: T;
  label: string;
};

type Props<T extends string | number> = {
  label?: string;
  hint?: string;
  value: T;
  options: AppSelectOption<T>[];
  onValueChange: (value: T) => void;
  accessibilityLabel?: string;
};

function labelForValue<T extends string | number>(
  options: AppSelectOption<T>[],
  value: T,
): string {
  return options.find((opt) => opt.value === value)?.label ?? String(value);
}

export function AppSelect<T extends string | number>({
  label,
  hint,
  value,
  options,
  onValueChange,
  accessibilityLabel,
}: Props<T>) {
  const { colors } = useAppTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const selectedLabel = labelForValue(options, value);
  const isWeb = Platform.OS === "web";

  const openPicker = () => {
    if (isWeb) {
      setModalVisible(true);
      return;
    }
    Alert.alert(
      label ?? "Choose",
      undefined,
      [
        ...options.map((opt) => ({
          text: opt.value === value ? `✓ ${opt.label}` : opt.label,
          onPress: () => onValueChange(opt.value),
        })),
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const pick = (next: T) => {
    onValueChange(next);
    closeModal();
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}
      {hint ? <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label ?? "Select option"}
        accessibilityValue={{ text: selectedLabel }}
        onPress={openPicker}
        style={({ pressed }) => [
          styles.trigger,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[styles.triggerText, { color: colors.text }]} numberOfLines={1}>
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </Pressable>

      {isWeb ? (
        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
          <Pressable style={styles.webBackdrop} onPress={closeModal}>
            <Pressable
              style={[
                styles.webPanel,
                elevatedShadow(),
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              {label ? (
                <Text style={[styles.webTitle, { color: colors.text }]}>{label}</Text>
              ) : null}
              <ScrollView style={styles.webList} keyboardShouldPersistTaps="handled">
                {options.map((opt) => {
                  const selected = opt.value === value;
                  return (
                    <Pressable
                      key={String(opt.value)}
                      onPress={() => pick(opt.value)}
                      style={({ pressed }) => [
                        styles.webOption,
                        {
                          backgroundColor: selected
                            ? colors.primaryMuted
                            : pressed
                              ? colors.overlay
                              : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.webOptionText,
                          { color: selected ? colors.primary : colors.text },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
              <AppButton label="Cancel" variant="secondary" compact onPress={closeModal} />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: typography.label,
  hint: { ...typography.caption, lineHeight: 18 },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  triggerText: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
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
    maxWidth: 360,
    maxHeight: "80%",
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  webTitle: {
    ...typography.headline,
  },
  webList: {
    maxHeight: 320,
  },
  webOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  webOptionText: {
    ...typography.body,
    flex: 1,
  },
});
