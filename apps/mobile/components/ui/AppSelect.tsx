import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { DismissibleModal } from "@/components/ui/DismissibleModal";
import { radius, spacing, typography } from "@/constants/theme";
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

  const openPicker = () => {
    setModalVisible(true);
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

      <DismissibleModal
        visible={modalVisible}
        onClose={closeModal}
        variant="center"
        sheetStyle={styles.selectPanel}
      >
        {label ? <Text style={[styles.panelTitle, { color: colors.text }]}>{label}</Text> : null}
        <ScrollView style={styles.optionList} keyboardShouldPersistTaps="handled">
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <Pressable
                key={String(opt.value)}
                onPress={() => pick(opt.value)}
                style={({ pressed }) => [
                  styles.optionRow,
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
                  style={[styles.optionText, { color: selected ? colors.primary : colors.text }]}
                >
                  {opt.label}
                </Text>
                {selected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
        <AppButton label="Cancel" variant="secondary" compact onPress={closeModal} />
      </DismissibleModal>
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
  selectPanel: {
    maxWidth: 360,
    maxHeight: "80%",
    padding: spacing.lg,
  },
  panelTitle: {
    ...typography.headline,
  },
  optionList: {
    maxHeight: 320,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  optionText: {
    ...typography.body,
    flex: 1,
  },
});
