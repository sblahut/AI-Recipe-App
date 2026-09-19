import { Alert, Platform, Share } from "react-native";

import type { GeneratedRecipe, ShoppingListDetail } from "@/lib/schemas";

export async function shareText(title: string, message: string): Promise<void> {
  try {
    if (Platform.OS === "web" && canUseWebShare()) {
      await navigator.share({ title, text: message });
      return;
    }
    await Share.share(Platform.OS === "ios" ? { title, message } : { message, title });
  } catch (e) {
    if (isShareCancel(e)) {
      return;
    }
    Alert.alert("Share failed", e instanceof Error ? e.message : "Could not open the share sheet.");
  }
}

export function formatRecipeShare(recipe: GeneratedRecipe): string {
  const lines = [recipe.title];
  const meta = [
    recipe.servings != null ? `Serves ${recipe.servings}` : null,
    recipe.prep_minutes != null ? `${recipe.prep_minutes} min` : null,
  ].filter((part): part is string => part != null);
  if (meta.length > 0) {
    lines.push(meta.join(" · "));
  }
  if (recipe.ingredients.length > 0) {
    lines.push("", "Ingredients:");
    for (const line of recipe.ingredients) {
      const qty = line.quantity?.trim();
      lines.push(qty ? `- ${line.name} (${qty})` : `- ${line.name}`);
    }
  }
  if (recipe.steps.length > 0) {
    lines.push("", "Steps:");
    recipe.steps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step}`);
    });
  }
  return lines.join("\n");
}

export function formatShoppingListShare(list: ShoppingListDetail): string {
  const lines = [list.name, ""];
  if (list.items.length === 0) {
    lines.push("(empty list)");
    return lines.join("\n");
  }
  for (const item of list.items) {
    const mark = item.checked ? "x" : " ";
    const qtyParts = [item.quantity, item.unit].filter((part) => part != null && part !== "");
    const qty = qtyParts.length > 0 ? ` (${qtyParts.join(" ")})` : "";
    lines.push(`- [${mark}] ${item.name}${qty}`);
  }
  return lines.join("\n");
}

function canUseWebShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

function isShareCancel(error: unknown): boolean {
  return error instanceof Error && /cancel/i.test(error.message);
}
