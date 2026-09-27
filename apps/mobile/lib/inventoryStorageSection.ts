import { isKnownZone } from "@/constants/inventoryLocations";
import type { StorageFilterId } from "@/constants/storageFilters";
import type { Ingredient } from "@/lib/schemas";

/** Maps an ingredient to a Pantry collapsible storage section id. */
export function storageSectionIdForItem(
  item: Ingredient,
  customZones: readonly string[],
): StorageFilterId {
  const loc = item.location?.trim() ?? "";
  if (!loc) {
    return "Unassigned";
  }
  if (isKnownZone(loc, customZones)) {
    return loc;
  }
  return "Other";
}
