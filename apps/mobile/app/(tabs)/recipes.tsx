import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { AppButton } from "@/components/ui/AppButton";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import type { ThemeColors } from "@/constants/theme";
import { spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { apiFetch, apiJson } from "@/lib/api";
import { pickStorageLocation } from "@/lib/pickStorageLocation";
import { recipeToIngredientCreates } from "@/lib/recipeIngredients";
import { formatRecipeShare, shareText } from "@/lib/shareContent";
import { stockFromGeneratedRecipe } from "@/lib/stockFromGeneratedRecipe";
import { stockFromSavedRecipe } from "@/lib/stockFromRecipe";
import {
  healthSchema,
  ingredientSchema,
  recipeGenerateResponseSchema,
  savedRecipeReadSchema,
  shoppingListSchema,
  type GeneratedRecipe,
  type SavedRecipe,
  type ShoppingList,
} from "@/lib/schemas";

type GenerateReady = {
  serverOk: boolean;
  ollamaOk: boolean | null;
  ingredientCount: number;
};

export default function RecipesScreen() {
  const { colors } = useAppTheme();
  const { serverUrl } = useServerSettings();
  const [saved, setSaved] = useState<SavedRecipe[]>([]);
  const [generated, setGenerated] = useState<GeneratedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [ready, setReady] = useState<GenerateReady>({
    serverOk: false,
    ollamaOk: null,
    ingredientCount: 0,
  });

  const loadSaved = useCallback(async () => {
    const raw = await apiJson<unknown>("/recipes/saved", { baseUrl: serverUrl });
    setSaved(z.array(savedRecipeReadSchema).parse(raw));
  }, [serverUrl]);

  const loadLists = useCallback(async () => {
    const raw = await apiJson<unknown>("/shopping/lists", { baseUrl: serverUrl });
    setLists(z.array(shoppingListSchema).parse(raw));
  }, [serverUrl]);

  const loadReady = useCallback(async () => {
    try {
      const [healthRaw, inventoryRaw] = await Promise.all([
        apiJson<unknown>("/health", { baseUrl: serverUrl }),
        apiJson<unknown>("/inventory", { baseUrl: serverUrl }),
      ]);
      const health = healthSchema.parse(healthRaw);
      const inventory = z.array(ingredientSchema).parse(inventoryRaw);
      setReady({
        serverOk: health.status === "ok",
        ollamaOk: health.ollama,
        ingredientCount: inventory.length,
      });
    } catch {
      setReady({ serverOk: false, ollamaOk: null, ingredientCount: 0 });
    }
  }, [serverUrl]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadSaved().catch(() => undefined);
      void loadLists().catch(() => undefined);
      void loadReady();
    });
  }, [loadSaved, loadLists, loadReady]);

  const generate = async () => {
    if (!ready.serverOk) {
      Alert.alert(
        "Server offline",
        "Start the recipe API (server/run.ps1) and set the home server URL in Settings. Use port 8000, not Metro 8081.",
      );
      return;
    }
    if (ready.ingredientCount === 0) {
      Alert.alert("No ingredients", "Add items on the Ingredients tab first. Generation uses what you have at home.");
      return;
    }
    if (ready.ollamaOk === false) {
      Alert.alert(
        "Ollama offline",
        "Start Ollama on the same PC as the API and pull the configured model (default mistral:7b).",
      );
      return;
    }

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
      void loadReady();
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

  const addRecipeToIngredients = async (recipe: GeneratedRecipe) => {
    const location = await pickStorageLocation("Add to ingredients");
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

      <Card>
        <Text style={[styles.readyTitle, { color: colors.text }]}>Needed to generate</Text>
        <ReadyLine
          ok={ready.serverOk}
          colors={colors}
          label={ready.serverOk ? "Home server is reachable" : "Home server offline — check Settings"}
        />
        <ReadyLine
          ok={ready.ollamaOk === true}
          colors={colors}
          label={
            ready.ollamaOk === true
              ? "Ollama is running"
              : ready.ollamaOk === false
                ? "Ollama is offline on the PC"
                : "Ollama status unknown"
          }
        />
        <ReadyLine
          ok={ready.ingredientCount > 0}
          colors={colors}
          label={
            ready.ingredientCount > 0
              ? `${ready.ingredientCount} ingredient${ready.ingredientCount === 1 ? "" : "s"} at home`
              : "Add ingredients on the Ingredients tab"
          }
        />
      </Card>

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
          onStock={() => void stockFromGeneratedRecipe(recipe, serverUrl)}
          onShare={() => void shareText(recipe.title, formatRecipeShare(recipe))}
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
              onStock={() => void stockFromSavedRecipe(item.id, serverUrl)}
              onShare={() => void shareText(item.title, formatRecipeShare(item.recipe))}
              saveLabel="Save again"
            />
          )}
        />
      )}
    </Screen>
  );
}

function ReadyLine({ ok, label, colors }: { ok: boolean; label: string; colors: ThemeColors }) {
  return (
    <Text style={[styles.readyLine, { color: ok ? colors.success : colors.textMuted }]}>
      {ok ? "✓" : "○"} {label}
    </Text>
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
  onStock: () => void;
  onShare: () => void;
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
  onStock,
  onShare,
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
        <AppButton label="Share" variant="secondary" compact onPress={onShare} />
        <AppButton label="→ Ingredients" compact onPress={onAddIngredients} />
        <AppButton label="→ Shopping" variant="accent" compact onPress={onAddShopping} />
        <AppButton label="Stock + scan" variant="secondary" compact onPress={onStock} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md },
  lead: { ...typography.caption, lineHeight: 20 },
  readyTitle: typography.headline,
  readyLine: { ...typography.caption, lineHeight: 20 },
  section: { ...typography.title, marginTop: spacing.md },
  title: typography.headline,
  meta: typography.caption,
  step: { ...typography.caption, lineHeight: 20 },
  savedList: { gap: spacing.sm },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
});
