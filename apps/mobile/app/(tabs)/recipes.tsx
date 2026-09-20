import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { TextInput } from "react-native";
import { z } from "zod";

import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { SearchField, dismissSearchKeyboard } from "@/components/ui/SearchField";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import type { ThemeColors } from "@/constants/theme";
import { spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { apiFetch, apiJson } from "@/lib/api";
import { formatRecipeShare, shareText } from "@/lib/shareContent";
import { stockFromGeneratedRecipe } from "@/lib/stockFromGeneratedRecipe";
import { stockFromSavedRecipe } from "@/lib/stockFromRecipe";
import { textMatchesSearch } from "@/lib/textSearch";
import {
  healthSchema,
  ingredientSchema,
  recipeGenerateResponseSchema,
  recipeImportResponseSchema,
  savedRecipeReadSchema,
  shoppingFromRecipeResponseSchema,
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

function recipeMatchesSearch(recipe: GeneratedRecipe, query: string): boolean {
  if (!textMatchesSearch(query, recipe.title)) {
    return recipe.ingredients.some((line) => textMatchesSearch(query, line.name));
  }
  return true;
}

function findFavoriteMatch(
  favorites: SavedRecipe[],
  recipe: GeneratedRecipe,
): SavedRecipe | undefined {
  const title = recipe.title.trim().toLowerCase();
  return favorites.find((row) => row.recipe.title.trim().toLowerCase() === title);
}

export default function RecipesScreen() {
  const { colors } = useAppTheme();
  const { serverUrl } = useServerSettings();
  const { preferences } = useUserPreferences();
  const [favorites, setFavorites] = useState<SavedRecipe[]>([]);
  const [generated, setGenerated] = useState<GeneratedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [importText, setImportText] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);
  const dismissSearch = () => dismissSearchKeyboard(searchInputRef);
  const [ready, setReady] = useState<GenerateReady>({
    serverOk: false,
    ollamaOk: null,
    ingredientCount: 0,
  });

  const loadFavorites = useCallback(async () => {
    const raw = await apiJson<unknown>("/recipes/saved", { baseUrl: serverUrl });
    const all = z.array(savedRecipeReadSchema).parse(raw);
    setFavorites(all.filter((row) => row.favorite));
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
      void loadFavorites().catch(() => undefined);
      void loadLists().catch(() => undefined);
      void loadReady();
    });
  }, [loadFavorites, loadLists, loadReady]);

  const filteredGenerated = useMemo(
    () => generated.filter((recipe) => recipeMatchesSearch(recipe, searchQuery)),
    [generated, searchQuery],
  );

  const filteredFavorites = useMemo(
    () => favorites.filter((row) => recipeMatchesSearch(row.recipe, searchQuery)),
    [favorites, searchQuery],
  );

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
        body: JSON.stringify({
          use_all: true,
          count: preferences.defaultRecipeCount ?? 3,
          persist_generated: preferences.autoPersistGeneratedRecipes,
          prioritize_expiring: preferences.prioritizeExpiringWhenGenerating ?? true,
        }),
      });
      const parsed = recipeGenerateResponseSchema.parse(raw);
      setGenerated(parsed.recipes);
      if (parsed.saved_recipes.length > 0) {
        await loadFavorites();
      }
    } catch (e) {
      Alert.alert("Generate failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
      void loadReady();
    }
  };

  const importRecipe = async () => {
    const text = importText.trim();
    const url = importUrl.trim();
    if (!url && text.length < 20) {
      Alert.alert(
        "Add a recipe",
        "Paste recipe text (20+ characters) or enter a recipe page URL.",
      );
      return;
    }
    if (url && text.length > 0) {
      Alert.alert("Import recipe", "Use either pasted text or a URL, not both.");
      return;
    }
    if (!ready.serverOk) {
      Alert.alert("Server offline", "Check the home server URL in Settings.");
      return;
    }
    if (ready.ollamaOk === false) {
      Alert.alert("Ollama offline", "Recipe import uses the same Ollama model as generate.");
      return;
    }

    setImportLoading(true);
    try {
      const raw = await apiJson<unknown>("/recipes/import", {
        baseUrl: serverUrl,
        method: "POST",
        body: JSON.stringify({
          ...(url ? { url } : { text }),
          persist: preferences.autoPersistGeneratedRecipes,
        }),
      });
      const parsed = recipeImportResponseSchema.parse(raw);
      setGenerated((prev) => [parsed.recipe, ...prev.filter((r) => r.title !== parsed.recipe.title)]);
      setImportText("");
      setImportUrl("");
      if (parsed.saved_recipe) {
        await loadFavorites();
      }
      Alert.alert("Imported", parsed.recipe.title);
    } catch (e) {
      Alert.alert("Import failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setImportLoading(false);
    }
  };

  const toggleFavorite = async (recipe: GeneratedRecipe, favoriteId?: number) => {
    const existing =
      favoriteId != null
        ? favorites.find((row) => row.id === favoriteId)
        : findFavoriteMatch(favorites, recipe);
    try {
      if (existing) {
        await apiFetch(`/recipes/saved/${existing.id}`, { baseUrl: serverUrl, method: "DELETE" });
      } else {
        await apiFetch("/recipes/saved", {
          baseUrl: serverUrl,
          method: "POST",
          body: JSON.stringify({ recipe, favorite: true }),
        });
      }
      await loadFavorites();
    } catch (e) {
      Alert.alert("Favorites", e instanceof Error ? e.message : "Could not update favorite");
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
                const raw = await apiJson<unknown>("/shopping/from-recipe", {
                  baseUrl: serverUrl,
                  method: "POST",
                  body: JSON.stringify({ list_id: list.id, recipe }),
                });
                const result = shoppingFromRecipeResponseSchema.parse(raw);
                const skipped = result.skipped_in_pantry.length;
                const added = result.added.length;
                const detail =
                  skipped > 0
                    ? `${added} added to ${list.name}. ${skipped} already in ingredients.`
                    : `${added} items added to ${list.name}.`;
                Alert.alert(added > 0 ? "Added" : "Nothing to buy", detail);
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
      <Pressable onPress={dismissSearch}>
        <Text style={[styles.lead, { color: colors.textMuted }]}>
          Uses ingredients at home and your Ollama server. Tap the star to add recipes to Favorites.
        </Text>
      </Pressable>

      <Pressable onPress={dismissSearch}>
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
      </Pressable>

      <AppButton
        label={loading ? "Generating…" : "Generate from ingredients"}
        loading={loading}
        onPress={() => {
          dismissSearch();
          void generate();
        }}
      />

      <Card>
        <Text style={[styles.importCardTitle, { color: colors.text }]}>Import recipe</Text>
        <Text style={[styles.importHint, { color: colors.textMuted }]}>
          Paste text or paste a public recipe page URL. The server fetches the page and parses it with
          Ollama (HTTPS only, no LAN URLs).
        </Text>
        <AppTextField
          label="Recipe URL"
          value={importUrl}
          onChangeText={setImportUrl}
          placeholder="https://…"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <AppTextField
          label="Recipe text"
          value={importText}
          onChangeText={setImportText}
          placeholder="Title, ingredients, and steps…"
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          style={styles.importInput}
          autoCapitalize="sentences"
        />
        <AppButton
          label={importLoading ? "Importing…" : "Import with AI"}
          variant="secondary"
          loading={importLoading}
          onPress={() => {
            dismissSearch();
            void importRecipe();
          }}
        />
      </Card>

      <SearchField
        ref={searchInputRef}
        placeholder="Search recipes by title or ingredient"
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {generated.length > 0 ? (
        <>
          <Pressable onPress={dismissSearch}>
            <Text style={[styles.section, { color: colors.text }]}>Generated ideas</Text>
          </Pressable>
          {filteredGenerated.length === 0 ? (
            <Pressable onPress={dismissSearch}>
              <EmptyState title="No matches" subtitle="Try a different search term." />
            </Pressable>
          ) : (
            filteredGenerated.map((recipe) => {
              const isFavorite = findFavoriteMatch(favorites, recipe) != null;
              return (
                <RecipeCard
                  key={recipe.title}
                  recipe={recipe}
                  colors={colors}
                  isFavorite={isFavorite}
                  onDismissSearch={dismissSearch}
                  onToggleFavorite={() => void toggleFavorite(recipe)}
                  onAddShopping={() => void addRecipeToShoppingList(recipe)}
                  onAddToIngredients={() => void stockFromGeneratedRecipe(recipe, serverUrl)}
                  onShare={() => void shareText(recipe.title, formatRecipeShare(recipe))}
                />
              );
            })
          )}
        </>
      ) : null}

      <Pressable style={styles.favoritesHeading} onPress={dismissSearch}>
        <Ionicons name="star" size={20} color={colors.primary} />
        <Text style={[styles.section, styles.favoritesTitle, { color: colors.text }]}>Favorites</Text>
      </Pressable>
      {favorites.length === 0 ? (
        <EmptyState
          title="No favorites yet"
          subtitle="Generate ideas above, then tap the star on any recipe to save it here."
        />
      ) : filteredFavorites.length === 0 ? (
        <EmptyState title="No matches in favorites" subtitle="Try a different search term." />
      ) : (
        <FlatList
          data={filteredFavorites}
          scrollEnabled={false}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.favoritesList}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item.recipe}
              titleOverride={item.title}
              meta={`Favorited ${new Date(item.created_at).toLocaleDateString()}`}
              colors={colors}
              isFavorite
              onDismissSearch={dismissSearch}
              onToggleFavorite={() => void toggleFavorite(item.recipe, item.id)}
              onAddShopping={() => void addRecipeToShoppingList(item.recipe)}
              onAddToIngredients={() => void stockFromSavedRecipe(item.id, serverUrl)}
              onShare={() => void shareText(item.title, formatRecipeShare(item.recipe))}
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
  isFavorite: boolean;
  onDismissSearch: () => void;
  onToggleFavorite: () => void;
  onAddShopping: () => void;
  onAddToIngredients: () => void;
  onShare: () => void;
};

function RecipeCard({
  recipe,
  titleOverride,
  meta,
  colors,
  isFavorite,
  onDismissSearch,
  onToggleFavorite,
  onAddShopping,
  onAddToIngredients,
  onShare,
}: RecipeCardProps) {
  const title = titleOverride ?? recipe.title;
  const subtitle =
    meta ??
    `${recipe.prep_minutes ?? "?"} min · serves ${recipe.servings ?? "?"} · ${recipe.ingredients.length} ingredients`;

  return (
    <Pressable onPress={onDismissSearch}>
    <Card>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>{subtitle}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? `Remove ${title} from favorites` : `Add ${title} to favorites`}
          hitSlop={10}
          onPress={() => {
            onDismissSearch();
            onToggleFavorite();
          }}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons
            name={isFavorite ? "star" : "star-outline"}
            size={26}
            color={isFavorite ? colors.primary : colors.textMuted}
          />
        </Pressable>
      </View>
      {recipe.steps.slice(0, 2).map((step, i) => (
        <Text key={`${title}-step-${i}`} style={[styles.step, { color: colors.textSecondary }]}>
          {i + 1}. {step}
        </Text>
      ))}
      <View style={styles.actions}>
        <AppButton
          label="Share"
          variant="secondary"
          compact
          onPress={() => {
            onDismissSearch();
            onShare();
          }}
        />
        <AppButton
          label="Shopping"
          variant="accent"
          compact
          onPress={() => {
            onDismissSearch();
            onAddShopping();
          }}
        />
        <AppButton
          label="+ Ingredients"
          compact
          onPress={() => {
            onDismissSearch();
            onAddToIngredients();
          }}
        />
      </View>
    </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md },
  lead: { ...typography.caption, lineHeight: 20 },
  readyTitle: typography.headline,
  readyLine: { ...typography.caption, lineHeight: 20 },
  section: { ...typography.title, marginTop: spacing.md },
  importCardTitle: typography.headline,
  importHint: { ...typography.caption, lineHeight: 18, marginBottom: spacing.sm },
  importInput: { minHeight: 140, paddingTop: spacing.sm },
  favoritesHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  favoritesTitle: { marginTop: 0 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  titleBlock: { flex: 1 },
  title: typography.headline,
  meta: typography.caption,
  step: { ...typography.caption, lineHeight: 20 },
  favoritesList: { gap: spacing.sm },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
});
