import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { z } from "zod";

import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { apiFetch, apiJson } from "@/lib/api";
import {
  recipeGenerateResponseSchema,
  savedRecipeReadSchema,
  type GeneratedRecipe,
  type SavedRecipe,
} from "@/lib/schemas";

export default function RecipesScreen() {
  const { serverUrl } = useServerSettings();
  const [saved, setSaved] = useState<SavedRecipe[]>([]);
  const [generated, setGenerated] = useState<GeneratedRecipe[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSaved = useCallback(async () => {
    const raw = await apiJson<unknown>("/recipes/saved", { baseUrl: serverUrl });
    setSaved(z.array(savedRecipeReadSchema).parse(raw));
  }, [serverUrl]);

  useEffect(() => {
    void loadSaved().catch(() => undefined);
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
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable style={styles.btn} onPress={() => void generate()} disabled={loading}>
        <Text style={styles.btnText}>{loading ? "Generating…" : "Generate from pantry"}</Text>
      </Pressable>

      {generated.map((recipe) => (
        <View key={recipe.title} style={styles.card}>
          <Text style={styles.title}>{recipe.title}</Text>
          <Text style={styles.meta}>
            {recipe.prep_minutes ?? "?"} min · serves {recipe.servings ?? "?"}
          </Text>
          {recipe.steps.slice(0, 3).map((step, i) => (
            <Text key={`${recipe.title}-step-${i}`} style={styles.step}>
              {i + 1}. {step}
            </Text>
          ))}
          <Pressable style={styles.saveBtn} onPress={() => void saveRecipe(recipe)}>
            <Text style={styles.saveBtnText}>Save recipe</Text>
          </Pressable>
        </View>
      ))}

      <Text style={styles.section}>Saved recipes</Text>
      {saved.length === 0 ? (
        <Text style={styles.empty}>No saved recipes yet.</Text>
      ) : (
        <FlatList
          data={saved}
          scrollEnabled={false}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          )}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  btn: { backgroundColor: "#2563eb", padding: 14, borderRadius: 8, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
  section: { fontSize: 18, fontWeight: "700", marginTop: 16 },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  title: { fontSize: 17, fontWeight: "600" },
  meta: { color: "#555" },
  step: { color: "#333" },
  saveBtn: { marginTop: 8, alignSelf: "flex-start" },
  saveBtnText: { color: "#2563eb", fontWeight: "600" },
  empty: { color: "#666" },
});
