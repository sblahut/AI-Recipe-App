import { Alert } from "react-native";

import { BUILTIN_ZONES } from "@/constants/inventoryLocations";
import { getUserPreferences } from "@/lib/userPreferences";

/** Ask where scanned or bulk items should be stored. */
export async function pickStorageLocation(title = "Storage location"): Promise<string | null> {
  const prefs = await getUserPreferences();
  const locations = [...BUILTIN_ZONES, ...prefs.customZones];
  const defaultLoc = prefs.defaultStorageLocation?.trim() || null;

  if (!prefs.promptForStorageLocation && defaultLoc && locations.includes(defaultLoc)) {
    return defaultLoc;
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      defaultLoc ? `Default: ${defaultLoc}. Pick a location.` : "Choose where these items go.",
      [
        ...locations.map((loc) => ({
          text: loc === defaultLoc ? `${loc} (default)` : loc,
          onPress: () => {
            resolve(loc);
          },
        })),
        { text: "Cancel", style: "cancel" as const, onPress: () => resolve(null) },
      ],
    );
  });
}
