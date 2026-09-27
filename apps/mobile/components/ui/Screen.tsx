import type { ReactElement, ReactNode, RefObject } from "react";
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type ViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { spacing } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";

type Props = ViewProps & {
  scroll?: boolean;
  padded?: boolean;
  loading?: boolean;
  /** Fixed content above the scroll view (e.g. sticky Chef bar). */
  header?: ReactNode;
  contentContainerStyle?: object;
  refreshControl?: ReactElement<RefreshControlProps>;
  scrollRef?: RefObject<ScrollView | null>;
};

export function Screen({
  scroll = false,
  padded = true,
  loading = false,
  header,
  style,
  contentContainerStyle,
  refreshControl,
  scrollRef,
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
        {header ? <View style={[pad, styles.headerSlot]}>{header}</View> : null}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[pad, styles.scrollContent, contentContainerStyle]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => Keyboard.dismiss()}
          refreshControl={refreshControl}
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
  headerSlot: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  scrollContent: { paddingBottom: spacing.xxxl, gap: spacing.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
