export const BUILTIN_ZONES = ["Fridge", "Pantry", "Freezer"] as const;
export type BuiltinZone = (typeof BUILTIN_ZONES)[number];

export const INVENTORY_LOCATIONS = [...BUILTIN_ZONES, "Other"] as const;
export type InventoryLocationPreset = (typeof INVENTORY_LOCATIONS)[number];

export function formatLocationLabel(location: string | null | undefined): string {
  if (!location?.trim()) {
    return "No location";
  }
  return location;
}

export function isBuiltinZone(location: string): location is BuiltinZone {
  return (BUILTIN_ZONES as readonly string[]).includes(location);
}

export function isKnownZone(location: string, customZones: readonly string[]): boolean {
  return isBuiltinZone(location) || customZones.includes(location);
}
