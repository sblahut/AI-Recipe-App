import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { cardShadow, radius, spacing, typography } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { chefFeaturesAvailable, type HomeServerReady } from "@/lib/homeServerReady";
import {
  RECIPE_CHEF_BAR_SUBTITLE,
  RECIPE_CHEF_CHAT_LABEL,
  RECIPE_CHEF_OFFLINE_CHIP,
  RECIPE_CHEF_RESUME_SUBTITLE,
} from "@/lib/uiActionLabels";

type Props = {
  ready: HomeServerReady;
  hasSession: boolean;
  onPress: () => void;
};

function chefBarAccessibilityLabel(ready: HomeServerReady, hasSession: boolean): string {
  const base = hasSession ? `${RECIPE_CHEF_CHAT_LABEL}, ${RECIPE_CHEF_RESUME_SUBTITLE}` : RECIPE_CHEF_CHAT_LABEL;
  if (!ready.serverOk) {
    return `${base}, Home server offline`;
  }
  if (ready.ollamaOk === false) {
    return `${base}, Ollama offline`;
  }
  return base;
}

export function AskTheChefBar({ ready, hasSession, onPress }: Props) {
  const { colors } = useAppTheme();
  const offline = !chefFeaturesAvailable(ready);
  const subtitle = hasSession ? RECIPE_CHEF_RESUME_SUBTITLE : RECIPE_CHEF_BAR_SUBTITLE;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={chefBarAccessibilityLabel(ready, hasSession)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bar,
        cardShadow(),
        {
          backgroundColor: offline ? colors.surface : colors.primaryMuted,
          borderColor: offline ? colors.border : colors.primary,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.mark,
          { backgroundColor: offline ? colors.overlay : colors.surface },
        ]}
      >
        <Ionicons
          name={offline ? "sparkles-outline" : "sparkles"}
          size={22}
          color={offline ? colors.tabInactive : colors.primary}
        />
      </View>
      <View style={styles.copy}>
        <Text
          style={[styles.title, { color: offline ? colors.textSecondary : colors.text }]}
          numberOfLines={1}
        >
          {RECIPE_CHEF_CHAT_LABEL}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {offline ? (
        <View style={[styles.chip, { backgroundColor: colors.overlay, borderColor: colors.border }]}>
          <Text style={[styles.chipLabel, { color: colors.textMuted }]}>
            {RECIPE_CHEF_OFFLINE_CHIP}
          </Text>
        </View>
      ) : null}
      <Ionicons
        name="chevron-forward"
        size={20}
        color={offline ? colors.tabInactive : colors.primary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 64,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.headline,
  },
  subtitle: {
    ...typography.caption,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  chipLabel: {
    ...typography.captionMedium,
  },
});
