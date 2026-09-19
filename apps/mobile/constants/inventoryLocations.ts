export const INVENTORY_LOCATIONS = ["Fridge", "Pantry", "Freezer", "Other"] as const;

export type InventoryLocationPreset = (typeof INVENTORY_LOCATIONS)[number];

export function formatLocationLabel(location: string | null | undefined): string {
  if (!location?.trim()) {
    return "No location";
  }
  return location;
}
