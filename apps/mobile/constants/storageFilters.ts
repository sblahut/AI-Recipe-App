import type { InventoryLocationPreset } from "@/constants/inventoryLocations";

export type StorageFilterId = "All" | "Unassigned" | InventoryLocationPreset;

export const STORAGE_FILTERS: {
  id: StorageFilterId;
  label: string;
  icon:
    | "layers-outline"
    | "thermometer-outline"
    | "file-tray-stacked-outline"
    | "snow-outline"
    | "ellipsis-horizontal-circle-outline"
    | "help-circle-outline";
}[] = [
  { id: "All", label: "All ingredients", icon: "layers-outline" },
  { id: "Fridge", label: "Fridge", icon: "thermometer-outline" },
  { id: "Pantry", label: "Pantry", icon: "file-tray-stacked-outline" },
  { id: "Freezer", label: "Freezer", icon: "snow-outline" },
  { id: "Other", label: "Other storage", icon: "ellipsis-horizontal-circle-outline" },
  { id: "Unassigned", label: "No location set", icon: "help-circle-outline" },
];
