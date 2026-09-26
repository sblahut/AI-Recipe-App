import type { Ingredient } from "@/lib/schemas";
import type { PantrySortBy } from "@/lib/userPreferences";

function expirySortKey(expiresAt: string | null): number {
  if (!expiresAt?.trim()) {
    return Number.POSITIVE_INFINITY;
  }
  const t = Date.parse(expiresAt);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

export function sortPantryItems(items: Ingredient[], sortBy: PantrySortBy): Ingredient[] {
  const copy = [...items];
  switch (sortBy) {
    case "expiry":
      copy.sort((a, b) => {
        const diff = expirySortKey(a.expires_at) - expirySortKey(b.expires_at);
        if (diff !== 0) {
          return diff;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });
      return copy;
    case "location":
      copy.sort((a, b) => {
        const locA = a.location?.trim() ?? "";
        const locB = b.location?.trim() ?? "";
        const diff = locA.localeCompare(locB, undefined, { sensitivity: "base" });
        if (diff !== 0) {
          return diff;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });
      return copy;
    case "name":
    default:
      copy.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      return copy;
  }
}
