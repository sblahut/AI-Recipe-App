import type { GeneratedRecipe } from "@/lib/schemas";

const BOGO_SUFFIX = /\s*\(\s*Publix BOGO\s*\)\s*$/i;

export function isLegacyBogoSourceLabel(name: string): boolean {
  return BOGO_SUFFIX.test(name);
}

export function stripPublixBogoLabel(name: string): string {
  return name.replace(BOGO_SUFFIX, "").trim();
}

/** Pantry item names the recipe draws from (excludes legacy BOGO entries stored in uses_from_pantry). */
export function getRecipePantrySourceNames(recipe: GeneratedRecipe): string[] {
  const pantry = recipe.uses_from_pantry ?? [];
  const explicitBogo = recipe.uses_from_publix_bogo ?? [];
  if (explicitBogo.length > 0) {
    return pantry;
  }
  return pantry.filter((name) => !isLegacyBogoSourceLabel(name));
}

/** Publix weekly-ad BOGO deal names used in the recipe. */
export function getRecipeBogoSourceNames(recipe: GeneratedRecipe): string[] {
  const explicit = recipe.uses_from_publix_bogo ?? [];
  if (explicit.length > 0) {
    return explicit.map(stripPublixBogoLabel);
  }
  const pantry = recipe.uses_from_pantry ?? [];
  return pantry.filter(isLegacyBogoSourceLabel).map(stripPublixBogoLabel);
}

/** Short line for recipe cards, e.g. "2 in pantry · 3 on Publix BOGO". */
export function formatRecipeSourceMetaLine(recipe: GeneratedRecipe): string | null {
  const pantryCount = getRecipePantrySourceNames(recipe).length;
  const bogoCount = getRecipeBogoSourceNames(recipe).length;
  const parts: string[] = [];
  if (pantryCount > 0) {
    parts.push(`${pantryCount} in pantry`);
  }
  if (bogoCount > 0) {
    parts.push(`${bogoCount} on Publix BOGO`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
