import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ServerSettingsProvider } from "@/contexts/ServerSettingsContext";

export default function RootLayout() {
  return (
    <ServerSettingsProvider>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="scan" options={{ title: "Scan barcode", presentation: "modal" }} />
      </Stack>
    </ServerSettingsProvider>
  );
}
