import type { UserPreferences } from "@/lib/userPreferences";
import { DEFAULT_PUBLIX_STORE_NUMBER } from "@/lib/storeChains";

export { DEFAULT_PUBLIX_STORE_NUMBER } from "@/lib/storeChains";

export function effectivePublixStoreNumber(preferences: UserPreferences): number {
  const n = preferences.publixStoreNumber;
  if (n != null && n > 0) {
    return n;
  }
  return DEFAULT_PUBLIX_STORE_NUMBER;
}

/** Publix store # for weekly-ad APIs. */
export function resolvePublixStoreNumberForApi(preferences: UserPreferences): number {
  return effectivePublixStoreNumber(preferences);
}

export function parsePublixStoreNumberInput(text: string): number | null {
  const digits = text.replace(/\D/g, "");
  if (!digits) {
    return null;
  }
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return n;
}
