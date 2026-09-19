import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { AppButton } from "@/components/ui/AppButton";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { INVENTORY_LOCATIONS } from "@/constants/inventoryLocations";
import type { ThemeColors } from "@/constants/theme";
import { spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { apiFetch, apiJson } from "@/lib/api";
import { recipeToIngredientCreates } from "@/lib/recipeIngredients";
import {
  recipeGenerateResponseSchema,
  savedRecipeReadSchema,
  shoppingListSchema,
  type GeneratedRecipe,
  type SavedRecipe,
  type ShoppingList,
} from "@/lib/schemas";

export default function RecipesScreen() {
  const { colors } = useAppTheme();
  const { serverUrl } = useServerSettings();
  const [saved, setSaved] = useState<SavedRecipe[]>([]);
  const [generated, setGenerated] = useState<GeneratedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [lists, setLists] = useState<ShoppingList[]>([]);

  const loadSaved = useCallback(async () => {
    const raw = await apiJson<unknown>("/recipes/saved", { baseUrl: serverUrl });
    setSaved(z.array(savedRecipeReadSchema).parse(raw));
  }, [serverUrl]);

  const loadLists = useCallback(async () => {
    const raw = await apiJson<unknown>("/shopping/lists", { baseUrl: serverUrl });
    setLists(z.array(shoppingListSchema).parse(raw));
  }, [serverUrl]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadSaved().catch(() => undefined);
      void loadLists().catch(() => undefined);
    });
  }, [loadSaved, loadLists]);

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

  const pickStorageLocation = (): Promise<string | null> =>
    new Promise((resolve) => {
      const presets = INVENTORY_LOCATIONS.filter((loc) => loc !== "Other");
      Alert.alert(
        "Add to ingredients",
        "Choose where these items are stored.",
        [
          ...presets.map((loc) => ({
            text: loc,
            onPress: () => {
              resolve(loc);
            },
          })),
          { text: "Cancel", style: "cancel" as const, onPress: () => resolve(null) },
        ],
      );
    });

  const addRecipeToIngredients = async (recipe: GeneratedRecipe) => {
    const location = await pickStorageLocation();
    if (!location) {
      return;
    }
    const items = recipeToIngredientCreates(recipe, location);
    if (items.length === 0) {
      Alert.alert("No ingredients", "This recipe has no ingredient lines to add.");
      return;
    }
    try {
      await apiFetch("/inventory/bulk", {
        baseUrl: serverUrl,
        method: "POST",
        body: JSON.stringify({ items }),
      });
      Alert.alert("Added", `${items.length} items added to ${location}.`);
    } catch (e) {
      Alert.alert("Add failed", e instanceof Error ? e.message : "Unknown error");
    }
  };

  const addRecipeToShoppingList = (recipe: GeneratedRecipe) => {
    if (lists.length === 0) {
      Alert.alert("No lists", "Create a shopping list on the Shopping tab first.");
      return;
    }
    Alert.alert(
      "Add to shopping list",
      recipe.title,
      [
        ...lists.map((list) => ({
          text: list.name,
          onPress: () => {
            void (async () => {
              try {
                for (const line of recipe.ingredients) {
                  await apiFetch(`/shopping/lists/${list.id}/items`, {
                    baseUrl: serverUrl,
                    method: "POST",
                    body: JSON.stringify({
                      name: line.name,
                      quantity_kind: "count",
                      quantity: 1,
                      unit: "each",
                    }),
                  });
                }
                Alert.alert("Added", `${recipe.ingredients.length} items added to ${list.name}.`);
              } catch (e) {
                Alert.alert("Add failed", e instanceof Error ? e.message : "Unknown error");
              }
            })();
          },
        })),
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  return (
    <Screen scroll contentContainerStyle={styles.scroll}>
      <Text style={[styles.lead, { color: colors.textMuted }]}>
        Uses ingredients at home and your Ollama server. Add a recipe’s lines to ingredients or a shopping list.
      </Text>

      <AppButton
        label={loading ? "Generating…" : "Generate from ingredients"}
        loading={loading}
        onPress={() => void generate()}
      />

      {generated.map((recipe) => (
        <RecipeCard
          key={recipe.title}
          recipe={recipe}
          colors={colors}
          onSave={() => void saveRecipe(recipe)}
          onAddIngredients={() => void addRecipeToIngredients(recipe)}
          onAddShopping={() => void addRecipeToShoppingList(recipe)}
        />
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
            <RecipeCard
              recipe={item.recipe}
              titleOverride={item.title}
              meta={`Saved ${new Date(item.created_at).toLocaleDateString()}`}
              colors={colors}
              onSave={() => void saveRecipe(item.recipe)}
              onAddIngredients={() => void addRecipeToIngredients(item.recipe)}
              onAddShopping={() => void addRecipeToShoppingList(item.recipe)}
              saveLabel="Save again"
            />
          )}
        />
      )}
    </Screen>
  );
}

type RecipeCardProps = {
  recipe: GeneratedRecipe;
  titleOverride?: string;
  meta?: string;
  colors: ThemeColors;
  onSave: () => void;
  onAddIngredients: () => void;
  onAddShopping: () => void;
  saveLabel?: string;
};

function RecipeCard({
  recipe,
  titleOverride,
  meta,
  colors,
  onSave,
  onAddIngredients,
  onAddShopping,
  saveLabel = "Save recipe",
}: RecipeCardProps) {
  const title = titleOverride ?? recipe.title;
  const subtitle =
    meta ??
    `${recipe.prep_minutes ?? "?"} min · serves ${recipe.servings ?? "?"} · ${recipe.ingredients.length} ingredients`;

  return (
    <Card>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>{subtitle}</Text>
      {recipe.steps.slice(0, 2).map((step, i) => (
        <Text key={`${title}-step-${i}`} style={[styles.step, { color: colors.textSecondary }]}>
          {i + 1}. {step}
        </Text>
      ))}
      <View style={styles.actions}>
        <AppButton label={saveLabel} variant="secondary" compact onPress={onSave} />
        <AppButton label="→ Ingredients" compact onPress={onAddIngredients} />
        <AppButton label="→ Shopping" variant="accent" compact onPress={onAddShopping} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md },
  lead: { ...typography.caption, lineHeight: 20 },
  section: { ...typography.title, marginTop: spacing.md },
  title: typography.headline,
  meta: typography.caption,
  step: { ...typography.caption, lineHeight: 20 },
  savedList: { gap: spacing.sm },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
});
