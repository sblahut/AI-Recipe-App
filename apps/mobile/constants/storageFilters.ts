import type { ComponentProps } from "react";

import type { Ionicons } from "@expo/vector-icons";

export type StorageFilterId = string;

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export type StorageFilter = {
  id: StorageFilterId;
  label: string;
  icon: IoniconName;
  kind: "system" | "builtin" | "custom";
};

const SYSTEM_FILTERS: StorageFilter[] = [
  { id: "All", label: "All ingredients", icon: "layers-outline", kind: "system" },
  { id: "Fridge", label: "Fridge", icon: "thermometer-outline", kind: "builtin" },
  { id: "Pantry", label: "Pantry", icon: "file-tray-stacked-outline", kind: "builtin" },
  { id: "Freezer", label: "Freezer", icon: "snow-outline", kind: "builtin" },
];

const TRAILING_FILTERS: StorageFilter[] = [
  { id: "Other", label: "Other storage", icon: "ellipsis-horizontal-circle-outline", kind: "system" },
  { id: "Unassigned", label: "No location set", icon: "help-circle-outline", kind: "system" },
];

export function buildStorageFilters(customZones: readonly string[]): StorageFilter[] {
  const custom: StorageFilter[] = customZones.map((zone) => ({
    id: zone,
    label: zone,
    icon: "cube-outline",
    kind: "custom",
  }));
  return [...SYSTEM_FILTERS, ...custom, ...TRAILING_FILTERS];
}
