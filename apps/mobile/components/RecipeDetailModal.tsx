import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { spacing, typography } from "@/constants/theme";
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
  const meta = [
    recipe.servings != null ? `Serves ${recipe.servings}` : null,
    recipe.prep_minutes != null ? `${recipe.prep_minutes} min prep` : null,
  ]
    .filter((part): part is string => part != null)
    .join(" · ");

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {meta ? <Text style={[styles.meta, { color: colors.textMuted }]}>{meta}</Text> : null}

          <Text style={[styles.sectionHeading, { color: colors.text }]}>Ingredients</Text>
          {recipe.ingredients.length === 0 ? (
            <Text style={[styles.body, { color: colors.textMuted }]}>No ingredients listed.</Text>
          ) : (
            recipe.ingredients.map((line, index) => {
              const qty = line.quantity?.trim();
              return (
                <Text
                  key={`${title}-ing-${index}-${line.name}`}
                  style={[styles.body, { color: colors.textSecondary }]}
                >
                  {qty ? `• ${line.name} (${qty})` : `• ${line.name}`}
                </Text>
              );
            })
          )}

          <Text style={[styles.sectionHeading, { color: colors.text }]}>Steps</Text>
          {recipe.steps.length === 0 ? (
            <Text style={[styles.body, { color: colors.textMuted }]}>No steps listed.</Text>
          ) : (
            recipe.steps.map((step, index) => (
              <Text
                key={`${title}-step-${index}`}
                style={[styles.body, styles.step, { color: colors.textSecondary }]}
              >
                {index + 1}. {step}
              </Text>
            ))
          )}
        </ScrollView>
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <AppButton label="Close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  title: { ...typography.title, fontSize: 22 },
  meta: { ...typography.caption, marginBottom: spacing.sm },
  sectionHeading: { ...typography.headline, marginTop: spacing.md },
  body: { ...typography.body, lineHeight: 22 },
  step: { marginBottom: spacing.xs },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
