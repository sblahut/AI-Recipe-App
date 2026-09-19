import { ActivityIndicator, ScrollView, StyleSheet, View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { spacing } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";

type Props = ViewProps & {
  scroll?: boolean;
  padded?: boolean;
  loading?: boolean;
  contentContainerStyle?: object;
};

export function Screen({
  scroll = false,
  padded = true,
  loading = false,
  style,
  contentContainerStyle,
  children,
  ...rest
}: Props) {
  const { colors } = useAppTheme();

  if (loading) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]} edges={["bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const pad = padded ? styles.padded : undefined;

  if (scroll) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]} edges={["bottom"]}>
        <ScrollView
          contentContainerStyle={[pad, styles.scrollContent, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.fill, { backgroundColor: colors.background }, pad, style]}
      edges={["bottom"]}
      {...rest}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg },
  scrollContent: { paddingBottom: spacing.xxl, gap: spacing.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
