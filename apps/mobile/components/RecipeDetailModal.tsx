import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { radius, spacing, typography } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import type { GeneratedRecipe } from "@/lib/schemas";

type Props = {
  visible: boolean;
  recipe: GeneratedRecipe | null;
  titleOverride?: string;
  onClose: () => void;
};

export function RecipeDetailModal({ visible, recipe, titleOverride, onClose }: Props) {
  const { colors } = useAppTheme();

  if (!recipe) {
    return null;
  }

  const title = titleOverride ?? recipe.title;
  const metaParts = [
    recipe.servings != null ? `Serves ${recipe.servings}` : null,
    recipe.prep_minutes != null ? `${recipe.prep_minutes} min` : null,
    `${recipe.ingredients.length} ingredients`,
  ].filter((part): part is string => part != null);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Title area */}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          {/* Meta pills */}
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
                  const qty = line.quantity?.trim();
                  const isLast = index === recipe.ingredients.length - 1;
                  return (
                    <View
                      key={`${title}-ing-${index}-${line.name}`}
                      style={[
                        styles.ingredientRow,
                        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
                      ]}
                    >
                      <Text style={[styles.ingredientName, { color: colors.text }]}>{line.name}</Text>
                      {qty ? (
                        <Text style={[styles.ingredientQty, { color: colors.textMuted }]}>{qty}</Text>
                      ) : null}
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* Pantry match */}
          {recipe.uses_from_pantry && recipe.uses_from_pantry.length > 0 ? (
            <View style={[styles.pantryNote, { backgroundColor: colors.successMuted }]}>
              <Text style={[styles.pantryNoteText, { color: colors.success }]}>
                {recipe.uses_from_pantry.length} ingredient{recipe.uses_from_pantry.length === 1 ? "" : "s"} already in your pantry
              </Text>
            </View>
          ) : null}

          {/* Steps */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Steps</Text>
            {recipe.steps.length === 0 ? (
              <Text style={[styles.emptyNote, { color: colors.textMuted }]}>No steps listed.</Text>
            ) : (
              recipe.steps.map((step, index) => (
                <View key={`${title}-step-${index}`} style={styles.stepRow}>
                  <View style={[styles.stepNumber, { backgroundColor: colors.primaryMuted }]}>
                    <Text style={[styles.stepNumberText, { color: colors.primary }]}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.textSecondary }]}>{step}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <AppButton label="Close" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  title: {
    ...typography.display,
    marginBottom: spacing.md,
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
  pantryNote: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
  },
  pantryNoteText: {
    ...typography.captionMedium,
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
