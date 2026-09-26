import { StyleSheet, Text, View } from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import type { ThemeColors } from "@/constants/theme";
import {
  getRecipeBogoSourceNames,
  getRecipePantrySourceNames,
} from "@/lib/recipeSourceLists";
import type { GeneratedRecipe } from "@/lib/schemas";

type Props = {
  recipe: GeneratedRecipe;
  colors: ThemeColors;
};

function SourceBlock({
  title,
  names,
  backgroundColor,
  textColor,
}: {
  title: string;
  names: string[];
  backgroundColor: string;
  textColor: string;
}) {
  if (names.length === 0) {
    return null;
  }
  return (
    <View style={[styles.block, { backgroundColor }]}>
      <Text style={[styles.heading, { color: textColor }]}>
        {names.length} ingredient{names.length === 1 ? "" : "s"} {title}
      </Text>
      {names.map((name) => (
        <Text key={name} style={[styles.item, { color: textColor }]}>
          · {name}
        </Text>
      ))}
    </View>
  );
}

export function RecipeSourceNotes({ recipe, colors }: Props) {
  const pantry = getRecipePantrySourceNames(recipe);
  const bogo = getRecipeBogoSourceNames(recipe);
  if (pantry.length === 0 && bogo.length === 0) {
    return null;
  }
  return (
    <View style={styles.wrap}>
      <SourceBlock
        title="from your pantry"
        names={pantry}
        backgroundColor={colors.successMuted}
        textColor={colors.success}
      />
      <SourceBlock
        title="from Publix BOGO deals"
        names={bogo}
        backgroundColor={colors.accentMuted}
        textColor={colors.accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  block: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  heading: {
    ...typography.captionMedium,
    marginBottom: spacing.xs,
  },
  item: {
    ...typography.caption,
    lineHeight: 20,
  },
});
