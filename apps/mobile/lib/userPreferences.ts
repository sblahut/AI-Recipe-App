import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

import { BUILTIN_ZONES } from "@/constants/inventoryLocations";
import { STORE_CHAINS } from "@/lib/storeChains";

export { STORE_CHAINS, type StoreChain } from "@/lib/storeChains";

export const USER_PREFS_KEY = "@ai_recipe/user_prefs";

export const groceryStoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  chain: z.enum(STORE_CHAINS),
});
export type GroceryStore = z.infer<typeof groceryStoreSchema>;

export const themeModeSchema = z.enum(["system", "light", "dark"]);
export type ThemeMode = z.infer<typeof themeModeSchema>;

export const pantrySortBySchema = z.enum(["name", "expiry", "location"]);
export type PantrySortBy = z.infer<typeof pantrySortBySchema>;

/** 0 = Sunday … 6 = Saturday (JS Date#getDay). */
export const weekStartsOnDaySchema = z.number().int().min(0).max(6);
export type WeekStartsOnDay = z.infer<typeof weekStartsOnDaySchema>;

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/)
  .nullable()
  .optional();

export const userPreferencesSchema = z.object({
  username: z.string(),
  customZones: z.array(z.string()),
  stores: z.array(groceryStoreSchema),
  autoPersistGeneratedRecipes: z.boolean().optional().default(false),
  themeMode: themeModeSchema.optional().default("system"),
  primaryColor: hexColorSchema.default(null),
  accentColor: hexColorSchema.default(null),
  defaultStorageLocation: z.string().nullable().optional().default(null),
  promptForStorageLocation: z.boolean().optional().default(true),
  prioritizeExpiringWhenGenerating: z.boolean().optional().default(true),
  defaultRecipeCount: z.number().int().min(1).max(10).optional().default(3),
  profilePhotoUri: z.string().nullable().optional().default(null),
  dietVegetarian: z.boolean().optional().default(false),
  dietVegan: z.boolean().optional().default(false),
  dietGlutenFree: z.boolean().optional().default(false),
  avoidIngredients: z.array(z.string()).optional().default([]),
  defaultConstraintText: z.string().optional().default(""),
  preferQuickRecipes: z.boolean().optional().default(false),
  preferKidFriendly: z.boolean().optional().default(false),
  autoFavoriteImportedRecipes: z.boolean().optional().default(false),
  omitPantryItemsFromShoppingLists: z.boolean().optional().default(true),
  defaultShoppingListId: z.number().int().nullable().optional().default(null),
  weekStartsOnDay: weekStartsOnDaySchema.optional().default(1),
  pantrySortBy: pantrySortBySchema.optional().default("name"),
  showPrepTimeProminent: z.boolean().optional().default(true),
  showStepNumbers: z.boolean().optional().default(true),
  expirationReminderDaysBefore: z.number().int().min(1).max(30).nullable().optional().default(null),
  globalLowStockThreshold: z.number().nullable().optional().default(null),
});
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  username: "",
  customZones: [],
  stores: [],
  autoPersistGeneratedRecipes: false,
  themeMode: "system",
  primaryColor: null,
  accentColor: null,
  defaultStorageLocation: null,
  promptForStorageLocation: true,
  prioritizeExpiringWhenGenerating: true,
  defaultRecipeCount: 3,
  profilePhotoUri: null,
  dietVegetarian: false,
  dietVegan: false,
  dietGlutenFree: false,
  avoidIngredients: [],
  defaultConstraintText: "",
  preferQuickRecipes: false,
  preferKidFriendly: false,
  autoFavoriteImportedRecipes: false,
  omitPantryItemsFromShoppingLists: true,
  defaultShoppingListId: null,
  weekStartsOnDay: 1,
  pantrySortBy: "name",
  showPrepTimeProminent: true,
  showStepNumbers: true,
  expirationReminderDaysBefore: null,
  globalLowStockThreshold: null,
};

export function parseAvoidIngredientsInput(input: string): string[] {
  const parts = input
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.slice(0, 50);
}

export async function resetUserPreferencesToDefaults(): Promise<UserPreferences> {
  await AsyncStorage.removeItem(USER_PREFS_KEY);
  return DEFAULT_USER_PREFERENCES;
}

export function allStorageLocations(customZones: readonly string[]): string[] {
  return [...BUILTIN_ZONES, ...customZones];
}

export const RESERVED_ZONE_NAMES = [
  "All",
  "Unassigned",
  "Other",
  "None",
  "Fridge",
  "Pantry",
  "Freezer",
] as const;

export function newLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const raw = await AsyncStorage.getItem(USER_PREFS_KEY);
  if (!raw) {
    return DEFAULT_USER_PREFERENCES;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return userPreferencesSchema.parse(parsed);
  } catch {
    return DEFAULT_USER_PREFERENCES;
  }
}

export async function setUserPreferences(prefs: UserPreferences): Promise<void> {
  await AsyncStorage.setItem(USER_PREFS_KEY, JSON.stringify(prefs));
}

export function normalizeZoneName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function isReservedZoneName(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return RESERVED_ZONE_NAMES.some((reserved) => reserved.toLowerCase() === lower);
}

export function zoneNameTaken(name: string, existing: readonly string[]): boolean {
  const lower = name.trim().toLowerCase();
  return existing.some((zone) => zone.toLowerCase() === lower);
}
