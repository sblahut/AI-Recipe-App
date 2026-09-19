import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const SERVER_URL_KEY = "@ai_recipe/server_url";

/** LAN default for phones; web uses localhost. Override in Settings. */
export const DEFAULT_SERVER_URL =
  Platform.OS === "web" ? "http://127.0.0.1:8000" : "http://192.168.1.50:8000";

export async function getStoredServerUrl(): Promise<string | null> {
  return AsyncStorage.getItem(SERVER_URL_KEY);
}

export async function setStoredServerUrl(url: string): Promise<void> {
  const trimmed = url.trim().replace(/\/+$/, "");
  await AsyncStorage.setItem(SERVER_URL_KEY, trimmed);
}
