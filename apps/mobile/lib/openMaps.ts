import { Linking, Platform } from "react-native";

export async function openAddressInMaps(address: string): Promise<void> {
  const query = address.trim();
  if (!query) {
    throw new Error("Add an address first.");
  }
  const encoded = encodeURIComponent(query);
  const native =
    Platform.OS === "ios"
      ? `maps:0,0?q=${encoded}`
      : Platform.OS === "android"
        ? `geo:0,0?q=${encoded}`
        : null;
  const web = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

  if (native) {
    try {
      await Linking.openURL(native);
      return;
    } catch {
      // Fall through to the web maps URL.
    }
  }
  await Linking.openURL(web);
}

export async function openExternalUrl(url: string): Promise<void> {
  await Linking.openURL(url);
}
