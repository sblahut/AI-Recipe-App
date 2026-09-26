import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { DismissibleModal } from "@/components/ui/DismissibleModal";
import { radius, spacing, typography } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { RecipeSourceNotes } from "@/components/RecipeSourceNotes";
import { formatModelDisplayText } from "@/lib/formatModelDisplayText";
import type { GeneratedRecipe } from "@/lib/schemas";

type Props = {
  visible: boolean;
  recipe: GeneratedRecipe | null;
  titleOverride?: string;
  onClose: () => void;
};

export function RecipeDetailModal({ visible, recipe, titleOverride, onClose }: Props) {
  const { colors } = useAppTheme();
  const { preferences } = useUserPreferences();
  const showPrepProminent = preferences.showPrepTimeProminent ?? true;
  const showStepNumbers = preferences.showStepNumbers ?? true;

  if (!recipe) {
    return null;
  }

  const title = formatModelDisplayText(titleOverride ?? recipe.title);
  const prepLabel = recipe.prep_minutes != null ? `${recipe.prep_minutes} min prep` : null;
  const metaParts = [
    recipe.servings != null ? `Serves ${recipe.servings}` : null,
    ...(showPrepProminent ? [] : [prepLabel]),
    `${recipe.ingredients.length} ingredients`,
  ].filter((part): part is string => part != null);

  return (
    <DismissibleModal visible={visible} onClose={onClose} variant="bottomSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Title area */}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          {/* Meta pills */}
          {showPrepProminent && prepLabel ? (
            <Text style={[styles.prepHeadline, { color: colors.primary }]}>{prepLabel}</Text>
          ) : null}
          <View style={styles.metaRow}>
            {metaParts.map((part) => (
              <View key={part} style={[styles.metaPill, { backgroundColor: colors.overlay }]}>
                <Text style={[styles.metaPillText, { color: colors.textSecondary }]}>{part}</Text>
              </View>
            ))}
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Ingredients</Text>
            <View style={[styles.ingredientsList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {recipe.ingredients.length === 0 ? (
                <Text style={[styles.emptyNote, { color: colors.textMuted }]}>No ingredients listed.</Text>
              ) : (
                recipe.ingredients.map((line, index) => {
                  const name = formatModelDisplayText(line.name);
                  const qty = line.quantity ? formatModelDisplayText(line.quantity.trim()) : "";
                  const isLast = index === recipe.ingredients.length - 1;
                  return (
                    <View
                      key={`${title}-ing-${index}-${line.name}`}
                      style={[
                        styles.ingredientRow,
                        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
                      ]}
                    >
                      <Text style={[styles.ingredientName, { color: colors.text }]}>{name}</Text>
                      {qty ? (
                        <Text style={[styles.ingredientQty, { color: colors.textMuted }]}>{qty}</Text>
                      ) : null}
                    </View>
                  );
                })
              )}
            </View>
          </View>

          <RecipeSourceNotes recipe={recipe} colors={colors} />

          {/* Steps */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Steps</Text>
            {recipe.steps.length === 0 ? (
              <Text style={[styles.emptyNote, { color: colors.textMuted }]}>No steps listed.</Text>
            ) : (
              recipe.steps.map((step, index) => (
                <View key={`${title}-step-${index}`} style={styles.stepRow}>
                  {showStepNumbers ? (
                    <View style={[styles.stepNumber, { backgroundColor: colors.primaryMuted }]}>
                      <Text style={[styles.stepNumberText, { color: colors.primary }]}>
                        {index + 1}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                    {formatModelDisplayText(step)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <AppButton label="Close" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </DismissibleModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 1,
    maxHeight: "100%",
  },
  scroll: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  title: {
    ...typography.display,
    marginBottom: spacing.md,
  },
  prepHeadline: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  metaPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  metaPillText: {
    ...typography.captionMedium,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    ...typography.title,
    marginBottom: spacing.md,
  },
  ingredientsList: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  ingredientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  ingredientName: {
    ...typography.body,
    flex: 1,
  },
  ingredientQty: {
    ...typography.captionMedium,
    marginLeft: spacing.md,
  },
  emptyNote: {
    ...typography.body,
    padding: spacing.lg,
  },
  stepRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNumberText: {
    ...typography.captionMedium,
    fontWeight: "700",
  },
  stepText: {
    ...typography.body,
    flex: 1,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
