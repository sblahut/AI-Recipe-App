import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ScrollView,
} from "react-native";
import type { TextInput } from "react-native";
import { z } from "zod";

import { RecipeDetailModal } from "@/components/RecipeDetailModal";
import { AppButton } from "@/components/ui/AppButton";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { AppTextField } from "@/components/ui/AppTextField";
import { SearchField, dismissSearchKeyboard } from "@/components/ui/SearchField";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import type { ThemeColors } from "@/constants/theme";
import { radius, spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { promptAddRecipeToMealPlan } from "@/lib/addToMealPlan";
import { apiFetch, apiJson } from "@/lib/api";
import { findFavoriteMatch } from "@/lib/recipeFavorites";
import { promptAddRecipeToShoppingList } from "@/lib/recipeShoppingList";
import { formatRecipeShare, shareText } from "@/lib/shareContent";
import {
  GENERATE_RECIPE_FROM_INGREDIENTS_LABEL,
  RECIPE_MEAL_PLAN_BUTTON_LABEL,
  RECIPE_SHOPPING_LIST_BUTTON_LABEL,
  shareRecipeAccessibilityLabel,
} from "@/lib/uiActionLabels";
import { recipeListKey } from "@/lib/recipeListKey";
import { recipeMatchesSearch } from "@/lib/recipeSearch";
import {
  healthSchema,
  ingredientSchema,
  recipeGenerateResponseSchema,
  recipeImportResponseSchema,
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
  const { preferences } = useUserPreferences();
  const [favorites, setFavorites] = useState<SavedRecipe[]>([]);
  const [generated, setGenerated] = useState<GeneratedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [importText, setImportText] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [detailRecipe, setDetailRecipe] = useState<GeneratedRecipe | null>(null);
  const [detailTitle, setDetailTitle] = useState<string | undefined>();
  const [aiSearchExpanded, setAiSearchExpanded] = useState(true);
  const [importExpanded, setImportExpanded] = useState(true);
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [ready, setReady] = useState<GenerateReady>({
    serverOk: false,
    ollamaOk: null,
    ingredientCount: 0,
  });
  const searchInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const generatedSectionY = useRef(0);
  const scrollToGeneratedPending = useRef(false);
  const dismissSearch = () => dismissSearchKeyboard(searchInputRef);

  const markScrollToGenerated = useCallback(() => {
    scrollToGeneratedPending.current = true;
  }, []);

  const performScrollToGenerated = useCallback(() => {
    const y = generatedSectionY.current;
    if (y <= 0) {
      return false;
    }
    scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing.sm), animated: true });
    scrollToGeneratedPending.current = false;
    return true;
  }, []);

  const onGeneratedSectionLayout = useCallback(
    (event: LayoutChangeEvent) => {
      generatedSectionY.current = event.nativeEvent.layout.y;
      if (scrollToGeneratedPending.current && generated.length > 0) {
        performScrollToGenerated();
      }
    },
    [generated.length, performScrollToGenerated],
  );

  useEffect(() => {
    if (!scrollToGeneratedPending.current || generated.length === 0) {
      return;
    }
    if (!performScrollToGenerated()) {
      requestAnimationFrame(() => {
        performScrollToGenerated();
      });
    }
  }, [generated, performScrollToGenerated]);

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

  const searchAiForRecipe = async () => {
    const query = aiSearchQuery.trim();
    if (query.length < 3) {
      Alert.alert("Search AI", "Describe the recipe you want (at least 3 characters).");
      return;
    }
    if (!ready.serverOk) {
      Alert.alert("Server offline", "Check the home server URL in Settings.");
      return;
    }
    if (ready.ollamaOk === false) {
      Alert.alert("Ollama offline", "AI search uses the same Ollama model as generate.");
      return;
    }

    setAiSearchLoading(true);
    try {
      const raw = await apiJson<unknown>("/recipes/search", {
        baseUrl: serverUrl,
        method: "POST",
        body: JSON.stringify({
          query,
          count: preferences.defaultRecipeCount ?? 3,
          persist_generated: preferences.autoPersistGeneratedRecipes,
        }),
      });
      const parsed = recipeGenerateResponseSchema.parse(raw);
      if (parsed.recipes.length > 0) {
        markScrollToGenerated();
      }
      setGenerated(parsed.recipes);
      if (parsed.recipes.length === 0) {
        Alert.alert("Search AI", "No recipes came back — try a different description.");
      } else if (parsed.recipes.length < (preferences.defaultRecipeCount ?? 3)) {
        Alert.alert(
          "Search AI",
          `Got ${parsed.recipes.length} recipe${parsed.recipes.length === 1 ? "" : "s"} (model sometimes returns fewer than ${preferences.defaultRecipeCount ?? 3}).`,
        );
      }
      if (parsed.saved_recipes.length > 0) {
        await loadFavorites();
      }
    } catch (e) {
      Alert.alert("Search failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setAiSearchLoading(false);
    }
  };

  const generate = async () => {
    if (!ready.serverOk) {
      Alert.alert(
        "Server offline",
        "Start the recipe API (server/run.ps1) and set the home server URL in Settings. Use port 8000, not Metro 8081.",
      );
      return;
    }
    if (ready.ingredientCount === 0) {
      Alert.alert("No ingredients", "Add items on the Pantry tab first. Generation uses what you have at home.");
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
      if (parsed.recipes.length > 0) {
        markScrollToGenerated();
      }
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

  const openRecipeDetail = (recipe: GeneratedRecipe, titleOverride?: string) => {
    dismissSearch();
    setDetailRecipe(recipe);
    setDetailTitle(titleOverride);
  };

  return (
    <Screen scroll scrollRef={scrollRef} contentContainerStyle={styles.scroll}>
      <RecipeDetailModal
        visible={detailRecipe != null}
        recipe={detailRecipe}
        {...(detailTitle ? { titleOverride: detailTitle } : {})}
        onClose={() => {
          setDetailRecipe(null);
          setDetailTitle(undefined);
        }}
      />

      {/* Status indicators */}
      <Pressable onPress={dismissSearch}>
        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ReadyLine
            ok={ready.serverOk}
            colors={colors}
            label={ready.serverOk ? "Home server connected" : "Home server offline"}
          />
          <ReadyLine
            ok={ready.ollamaOk === true}
            colors={colors}
            label={
              ready.ollamaOk === true
                ? "AI model ready"
                : ready.ollamaOk === false
                  ? "AI model offline"
                  : "AI model status unknown"
            }
          />
          <ReadyLine
            ok={ready.ingredientCount > 0}
            colors={colors}
            label={
              ready.ingredientCount > 0
                ? `${ready.ingredientCount} ingredient${ready.ingredientCount === 1 ? "" : "s"} available`
                : "Add ingredients on the Pantry tab"
            }
          />
        </View>
      </Pressable>

      {/* Primary generate CTA */}
      <AppButton
        label={loading ? "Finding recipes…" : GENERATE_RECIPE_FROM_INGREDIENTS_LABEL}
        loading={loading}
        onPress={() => {
          dismissSearch();
          void generate();
        }}
      />

      {/* AI Search */}
      <CollapsibleSection
        title="Search for a recipe idea"
        expanded={aiSearchExpanded}
        onToggle={() => setAiSearchExpanded((open) => !open)}
      >
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Describe what you want to cook and the AI will suggest ideas.
        </Text>
        <AppTextField
          placeholder="e.g. quick weeknight pasta, comfort soup…"
          value={aiSearchQuery}
          onChangeText={setAiSearchQuery}
        />
        <AppButton
          label={aiSearchLoading ? "Searching…" : "Search for recipe"}
          variant="secondary"
          loading={aiSearchLoading}
          onPress={() => {
            dismissSearch();
            void searchAiForRecipe();
          }}
        />
      </CollapsibleSection>

      {/* Import */}
      <CollapsibleSection
        title="Import a recipe"
        expanded={importExpanded}
        onToggle={() => setImportExpanded((open) => !open)}
      >
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Paste recipe text or a public recipe page URL.
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
          label={importLoading ? "Importing…" : "Import recipe"}
          variant="secondary"
          loading={importLoading}
          onPress={() => {
            dismissSearch();
            void importRecipe();
          }}
        />
      </CollapsibleSection>

      {/* Search filter */}
      <SearchField
        ref={searchInputRef}
        placeholder="Filter recipes by title or ingredient"
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Generated recipes */}
      <View
        collapsable={false}
        onLayout={onGeneratedSectionLayout}
        style={styles.generatedSection}
      >
        {generated.length > 0 ? (
          <>
            <Pressable onPress={dismissSearch}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Recipe ideas ({filteredGenerated.length})
              </Text>
            </Pressable>
            {filteredGenerated.length === 0 ? (
              <Pressable onPress={dismissSearch}>
                <EmptyState icon="search-outline" title="No matches" subtitle="Try a different search term." />
              </Pressable>
            ) : (
              filteredGenerated.map((recipe, index) => {
                const isFavorite = findFavoriteMatch(favorites, recipe) != null;
                return (
                  <RecipeCard
                    key={recipeListKey(recipe, index)}
                    recipe={recipe}
                    colors={colors}
                    isFavorite={isFavorite}
                    onDismissSearch={dismissSearch}
                    onViewRecipe={() => openRecipeDetail(recipe)}
                    onToggleFavorite={() => void toggleFavorite(recipe)}
                    onAddToShoppingList={() => promptAddRecipeToShoppingList(recipe, lists, serverUrl)}
                    onAddToMealPlan={() =>
                      void promptAddRecipeToMealPlan(recipe, serverUrl, favorites).then(() =>
                        loadFavorites(),
                      )
                    }
                    onShare={() => void shareText(recipe.title, formatRecipeShare(recipe))}
                  />
                );
              })
            )}
          </>
        ) : null}
      </View>

      {/* Favorites */}
      <CollapsibleSection
        title={`Family favorites (${favorites.length})`}
        expanded={favoritesExpanded}
        onToggle={() => setFavoritesExpanded((open) => !open)}
        leadingIcon="star"
      >
        {favorites.length === 0 ? (
          <EmptyState
            icon="star-outline"
            title="No favorites yet"
            subtitle="Generate recipe ideas above, then tap the star to save the ones your family loves."
          />
        ) : filteredFavorites.length === 0 ? (
          <EmptyState icon="search-outline" title="No matches in favorites" subtitle="Try a different search term." />
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
                meta={`Saved ${new Date(item.created_at).toLocaleDateString()}`}
                colors={colors}
                isFavorite
                onDismissSearch={dismissSearch}
                onViewRecipe={() => openRecipeDetail(item.recipe, item.title)}
                onToggleFavorite={() => void toggleFavorite(item.recipe, item.id)}
                onAddToShoppingList={() => promptAddRecipeToShoppingList(item.recipe, lists, serverUrl)}
                onAddToMealPlan={() =>
                  void promptAddRecipeToMealPlan(item.recipe, serverUrl, favorites).then(() =>
                    loadFavorites(),
                  )
                }
                onShare={() => void shareText(item.title, formatRecipeShare(item.recipe))}
              />
            )}
          />
        )}
      </CollapsibleSection>
    </Screen>
  );
}

function ReadyLine({ ok, label, colors }: { ok: boolean; label: string; colors: ThemeColors }) {
  return (
    <View style={styles.readyRow}>
      <View style={[styles.readyDot, { backgroundColor: ok ? colors.success : colors.textMuted }]} />
      <Text style={[styles.readyLabel, { color: ok ? colors.text : colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

type RecipeCardProps = {
  recipe: GeneratedRecipe;
  titleOverride?: string;
  meta?: string;
  colors: ThemeColors;
  isFavorite: boolean;
  onDismissSearch: () => void;
  onViewRecipe: () => void;
  onToggleFavorite: () => void;
  onAddToShoppingList: () => void;
  onAddToMealPlan: () => void;
  onShare: () => void;
};

function RecipeCard({
  recipe,
  titleOverride,
  meta,
  colors,
  isFavorite,
  onDismissSearch,
  onViewRecipe,
  onToggleFavorite,
  onAddToShoppingList,
  onAddToMealPlan,
  onShare,
}: RecipeCardProps) {
  const title = titleOverride ?? recipe.title;
  const subtitle =
    meta ??
    [
      recipe.prep_minutes != null ? `${recipe.prep_minutes} min` : null,
      recipe.servings != null ? `Serves ${recipe.servings}` : null,
      `${recipe.ingredients.length} ingredients`,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <Card>
      {/* Title + icons row */}
      <View style={styles.titleRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View full recipe for ${title}`}
          onPress={onViewRecipe}
          style={({ pressed }) => [styles.titleBlock, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[styles.recipeTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.recipeMeta, { color: colors.textMuted }]}>{subtitle}</Text>
        </Pressable>
        <View style={styles.titleIcons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={shareRecipeAccessibilityLabel(title)}
            hitSlop={10}
            onPress={() => {
              onDismissSearch();
              onShare();
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="share-outline" size={22} color={colors.textMuted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isFavorite ? `Remove ${title} from favorites` : `Add ${title} to favorites`
            }
            hitSlop={10}
            onPress={() => {
              onDismissSearch();
              onToggleFavorite();
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons
              name={isFavorite ? "star" : "star-outline"}
              size={24}
              color={isFavorite ? colors.primary : colors.textMuted}
            />
          </Pressable>
        </View>
      </View>

      {/* Preview steps */}
      <Pressable onPress={onViewRecipe}>
        {recipe.steps.slice(0, 2).map((step, i) => (
          <Text key={`${title}-step-${i}`} style={[styles.stepPreview, { color: colors.textSecondary }]}>
            {i + 1}. {step}
          </Text>
        ))}
        {recipe.steps.length > 2 ? (
          <Text style={[styles.moreSteps, { color: colors.textMuted }]}>
            +{recipe.steps.length - 2} more steps
          </Text>
        ) : null}
      </Pressable>

      {/* View full recipe link */}
      <Pressable onPress={onViewRecipe} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
        <Text style={[styles.viewFull, { color: colors.primary }]}>View full recipe</Text>
      </Pressable>

      {/* Action buttons */}
      <View style={styles.actions}>
        <AppButton
          label={RECIPE_SHOPPING_LIST_BUTTON_LABEL}
          variant="secondary"
          compact
          onPress={() => {
            onDismissSearch();
            onAddToShoppingList();
          }}
        />
        <AppButton
          label={RECIPE_MEAL_PLAN_BUTTON_LABEL}
          compact
          onPress={() => {
            onDismissSearch();
            onAddToMealPlan();
          }}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg },
  generatedSection: { gap: spacing.lg },
  statusCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  readyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  readyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  readyLabel: {
    ...typography.caption,
  },
  sectionTitle: {
    ...typography.title,
  },
  hint: { ...typography.caption, lineHeight: 18 },
  importInput: { minHeight: 140, paddingTop: spacing.sm },
  favoritesList: { gap: spacing.md },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  titleIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  titleBlock: { flex: 1 },
  recipeTitle: {
    ...typography.headline,
    lineHeight: 22,
  },
  recipeMeta: {
    ...typography.caption,
    marginTop: 2,
  },
  stepPreview: {
    ...typography.caption,
    lineHeight: 20,
  },
  moreSteps: {
    ...typography.caption,
    marginTop: 2,
    fontStyle: "italic",
  },
  viewFull: {
    ...typography.captionMedium,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
