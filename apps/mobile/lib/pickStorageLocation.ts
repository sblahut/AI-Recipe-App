import { Alert } from "react-native";

import { BUILTIN_ZONES } from "@/constants/inventoryLocations";
import { getUserPreferences } from "@/lib/userPreferences";

/** Ask where scanned or bulk items should be stored. */
export async function pickStorageLocation(title = "Storage location"): Promise<string | null> {
  const prefs = await getUserPreferences();
  const locations = [...BUILTIN_ZONES, ...prefs.customZones];
  return new Promise((resolve) => {
    Alert.alert(
      title,
      "Choose where these items go.",
      [
        ...locations.map((loc) => ({
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
