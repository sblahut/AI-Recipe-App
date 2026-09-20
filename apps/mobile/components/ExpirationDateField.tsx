import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { spacing, typography } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  dateFromExpiresAtIso,
  expirationInputFromIso,
  expiresAtIsoFromDate,
  expiresAtIsoFromDateInput,
  formatExpirationLabel,
} from "@/lib/expirationDate";

type Props = {
  value: string | null | undefined;
  onChange: (iso: string | null) => void;
};

export function ExpirationDateField({ value, onChange }: Props) {
  const { colors } = useAppTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [webInput, setWebInput] = useState(() => expirationInputFromIso(value));

  const selectedDate = dateFromExpiresAtIso(value);
  const label = formatExpirationLabel(value);

  const applyWebInput = (text: string) => {
    setWebInput(text);
    if (!text.trim()) {
      onChange(null);
      return;
    }
    const iso = expiresAtIsoFromDateInput(text);
    if (iso) {
      onChange(iso);
    }
  };

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (event.type === "dismissed" || !date) {
      return;
    }
    onChange(expiresAtIsoFromDate(date));
  };

  if (Platform.OS === "web") {
    return (
      <AppTextField
        label="Expiration date (optional)"
        value={webInput}
        onChangeText={applyWebInput}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        autoCorrect={false}
        hint={label ? `Stored as ${label}` : "Leave blank if the item does not expire"}
      />
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.text }]}>Expiration date (optional)</Text>
      <Text style={[styles.value, { color: label ? colors.text : colors.textMuted }]}>
        {label ?? "None set"}
      </Text>
      <View style={styles.actions}>
        <AppButton
          label={label ? "Change date" : "Set date"}
          variant="secondary"
          compact
          onPress={() => setShowPicker(true)}
        />
        {label ? (
          <AppButton label="Clear" variant="ghost" compact onPress={() => onChange(null)} />
        ) : null}
      </View>
      {showPicker ? (
        Platform.OS === "ios" ? (
          <View style={[styles.iosPicker, { borderColor: colors.border }]}>
            <DateTimePicker
              value={selectedDate ?? new Date()}
              mode="date"
              display="inline"
              onChange={onPickerChange}
            />
            <Pressable onPress={() => setShowPicker(false)} style={styles.doneRow}>
              <Text style={[styles.done, { color: colors.primary }]}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <DateTimePicker
            value={selectedDate ?? new Date()}
            mode="date"
            display="default"
            onChange={onPickerChange}
          />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs, marginTop: spacing.sm },
  label: typography.label,
  value: typography.body,
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  iosPicker: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    marginTop: spacing.xs,
  },
  doneRow: { alignItems: "flex-end", padding: spacing.sm },
  done: { ...typography.label, fontWeight: "600" },
});
