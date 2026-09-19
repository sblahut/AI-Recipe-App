import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text } from "react-native";
import { z } from "zod";

import { AppButton } from "@/components/ui/AppButton";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { apiFetch, apiJson } from "@/lib/api";
import {
  recipeGenerateResponseSchema,
  savedRecipeReadSchema,
  type GeneratedRecipe,
  type SavedRecipe,
} from "@/lib/schemas";

export default function RecipesScreen() {
  const { colors } = useAppTheme();
  const { serverUrl } = useServerSettings();
  const [saved, setSaved] = useState<SavedRecipe[]>([]);
  const [generated, setGenerated] = useState<GeneratedRecipe[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSaved = useCallback(async () => {
    const raw = await apiJson<unknown>("/recipes/saved", { baseUrl: serverUrl });
    setSaved(z.array(savedRecipeReadSchema).parse(raw));
  }, [serverUrl]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadSaved().catch(() => undefined);
    });
  }, [loadSaved]);

  const generate = async () => {
    setLoading(true);
    try {
      const raw = await apiJson<unknown>("/recipes/generate", {
        baseUrl: serverUrl,
        method: "POST",
        body: JSON.stringify({ use_all: true, count: 3 }),
      });
      const parsed = recipeGenerateResponseSchema.parse(raw);
      setGenerated(parsed.recipes);
    } catch (e) {
      Alert.alert("Generate failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const saveRecipe = async (recipe: GeneratedRecipe) => {
    await apiFetch("/recipes/saved", {
      baseUrl: serverUrl,
      method: "POST",
      body: JSON.stringify({ recipe, favorite: true }),
    });
    await loadSaved();
    Alert.alert("Saved", recipe.title);
  };

  return (
    <Screen scroll contentContainerStyle={styles.scroll}>
      <Text style={[styles.lead, { color: colors.textMuted }]}>
        Uses what is in your pantry and your home Ollama server.
      </Text>

      <AppButton
        label={loading ? "Generating…" : "Generate from pantry"}
        loading={loading}
        onPress={() => void generate()}
      />

      {generated.map((recipe) => (
        <Card key={recipe.title}>
          <Text style={[styles.title, { color: colors.text }]}>{recipe.title}</Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {recipe.prep_minutes ?? "?"} min · serves {recipe.servings ?? "?"}
          </Text>
          {recipe.steps.slice(0, 3).map((step, i) => (
            <Text key={`${recipe.title}-step-${i}`} style={[styles.step, { color: colors.textSecondary }]}>
              {i + 1}. {step}
            </Text>
          ))}
          <AppButton
            label="Save recipe"
            variant="secondary"
            compact
            onPress={() => void saveRecipe(recipe)}
            style={styles.saveBtn}
          />
        </Card>
      ))}

      <Text style={[styles.section, { color: colors.text }]}>Saved recipes</Text>
      {saved.length === 0 ? (
        <EmptyState title="No saved recipes yet" subtitle="Generate ideas above, then save your favorites." />
      ) : (
        <FlatList
          data={saved}
          scrollEnabled={false}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.savedList}
          renderItem={({ item }) => (
            <Card>
              <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md },
  lead: { ...typography.caption, lineHeight: 20 },
  section: { ...typography.title, marginTop: spacing.md },
  title: typography.headline,
  meta: typography.caption,
  step: { ...typography.caption, lineHeight: 20 },
  saveBtn: { alignSelf: "flex-start", marginTop: spacing.sm },
  savedList: { gap: spacing.sm },
});
