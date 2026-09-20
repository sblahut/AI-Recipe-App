import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useImperativeHandle, useRef, type RefObject } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  View,
  type TextInput,
  type TextInputProps,
} from "react-native";

import { spacing } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";

import { AppTextField } from "./AppTextField";

type Props = Omit<TextInputProps, "value" | "onChangeText"> & {
  value: string;
  onChangeText: (text: string) => void;
};

export const SearchField = forwardRef<TextInput, Props>(function SearchField(
  { value, onChangeText, style, ...rest },
  ref,
) {
  const { colors } = useAppTheme();
  const inputRef = useRef<TextInput>(null);

  useImperativeHandle(ref, () => inputRef.current as TextInput);

  const dismissKeyboard = () => {
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  const showClear = value.length > 0;

  return (
    <View style={styles.wrap}>
      <AppTextField
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        blurOnSubmit
        onSubmitEditing={dismissKeyboard}
        style={[styles.input, showClear ? styles.inputWithClear : null, style]}
        {...rest}
      />
      {showClear ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={10}
          onPress={() => onChangeText("")}
          style={({ pressed }) => [styles.clearBtn, { opacity: pressed ? 0.65 : 1 }]}
        >
          <Ionicons name="close-circle" size={22} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
});

export function dismissSearchKeyboard(inputRef: RefObject<TextInput | null>): void {
  inputRef.current?.blur();
  Keyboard.dismiss();
}

const styles = StyleSheet.create({
  wrap: { position: "relative" },
  input: {},
  inputWithClear: { paddingRight: spacing.xl + spacing.md },
  clearBtn: {
    position: "absolute",
    right: spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
});
