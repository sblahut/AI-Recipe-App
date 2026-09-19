import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

export const USER_PREFS_KEY = "@ai_recipe/user_prefs";

export const STORE_CHAINS = ["Publix", "Other"] as const;
export type StoreChain = (typeof STORE_CHAINS)[number];

export const groceryStoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  chain: z.enum(STORE_CHAINS),
});
export type GroceryStore = z.infer<typeof groceryStoreSchema>;

export const userPreferencesSchema = z.object({
  username: z.string(),
  customZones: z.array(z.string()),
  stores: z.array(groceryStoreSchema),
});
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  username: "",
  customZones: [],
  stores: [],
};

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
