import { DEFAULT_PUBLIX_STORE_NUMBER } from "@/lib/storeChains";
import {
  effectivePublixStoreNumber,
  parsePublixStoreNumberInput,
  resolvePublixStoreNumberForApi,
} from "@/lib/publixStoreNumber";
import type { UserPreferences } from "@/lib/userPreferences";

const prefs = (publixStoreNumber: number | null): UserPreferences =>
  ({ publixStoreNumber }) as UserPreferences;

describe("publixStoreNumber", () => {
  it("resolves from preferences with default fallback", () => {
    expect(resolvePublixStoreNumberForApi(prefs(1720))).toBe(1720);
    expect(effectivePublixStoreNumber(prefs(null))).toBe(DEFAULT_PUBLIX_STORE_NUMBER);
  });

  it("parses digit input", () => {
    expect(parsePublixStoreNumberInput("1720")).toBe(1720);
    expect(parsePublixStoreNumberInput("")).toBeNull();
    expect(parsePublixStoreNumberInput("abc")).toBeNull();
  });
});
