import { Alert } from "react-native";

import { INVENTORY_LOCATIONS } from "@/constants/inventoryLocations";

const STOCK_PRESETS = INVENTORY_LOCATIONS.filter((loc) => loc !== "Other");

/** Ask where scanned or bulk items should be stored. */
export function pickStorageLocation(title = "Storage location"): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      "Choose where these items go.",
      [
        ...STOCK_PRESETS.map((loc) => ({
          text: loc,
          onPress: () => {
            resolve(loc);
          },
        })),
        { text: "Cancel", style: "cancel" as const, onPress: () => resolve(null) },
      ],
    );
  });
}
