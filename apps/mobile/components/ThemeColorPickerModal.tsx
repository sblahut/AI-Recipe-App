import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import ColorPicker, { HueCircular, Panel1, Preview, Swatches } from "reanimated-color-picker";

import { AppButton } from "@/components/ui/AppButton";
import { spacing, typography } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { normalizeHexColor } from "@/lib/themePalette";

type SheetProps = {
  title: string;
  value: string;
  swatches: readonly string[];
  onClose: () => void;
  onSave: (hex: string) => void;
};

function ThemeColorPickerSheet({ title, value, swatches, onClose, onSave }: SheetProps) {
  const { colors } = useAppTheme();
  const [draft, setDraft] = useState(value);

  const save = () => {
    const normalized = normalizeHexColor(draft);
    if (normalized) {
      onSave(normalized);
    }
    onClose();
  };

  return (
    <Pressable
      style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={(e) => e.stopPropagation()}
    >
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <ColorPicker
        value={draft}
        onChangeJS={(result) => {
          const hex = normalizeHexColor(result.hex);
          if (hex) {
            setDraft(hex);
          }
        }}
        style={styles.picker}
      >
        <View style={styles.previewRow}>
          <Preview style={styles.preview} />
        </View>
        <HueCircular style={styles.wheel} />
        <Panel1 style={styles.panel} />
        <Swatches colors={[...swatches]} swatchStyle={styles.swatch} style={styles.swatchRow} />
      </ColorPicker>
      <View style={styles.actions}>
        <AppButton label="Cancel" variant="ghost" onPress={onClose} />
        <AppButton label="Use color" onPress={save} />
      </View>
    </Pressable>
  );
}

type Props = {
  visible: boolean;
  title: string;
  value: string;
  swatches: readonly string[];
  onClose: () => void;
  onSave: (hex: string) => void;
};

export function ThemeColorPickerModal({
  visible,
  title,
  value,
  swatches,
  onClose,
  onSave,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {visible ? (
          <ThemeColorPickerSheet
            key={value}
            title={title}
            value={value}
            swatches={swatches}
            onClose={onClose}
            onSave={onSave}
          />
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
    maxHeight: "92%",
  },
  title: {
    ...typography.headline,
    textAlign: "center",
  },
  picker: {
    gap: spacing.md,
  },
  previewRow: {
    alignItems: "center",
  },
  preview: {
    width: "100%",
    height: 44,
    borderRadius: 12,
  },
  wheel: {
    width: "100%",
    height: 200,
  },
  panel: {
    width: "100%",
    height: 160,
    borderRadius: 12,
  },
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
