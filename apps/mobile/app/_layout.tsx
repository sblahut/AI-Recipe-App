import "react-native-gesture-handler";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ServerSettingsProvider } from "@/contexts/ServerSettingsContext";
import { UserPreferencesProvider } from "@/contexts/UserPreferencesContext";
import { useAppTheme } from "@/hooks/useAppTheme";

function RootStack() {
  const { colors, isDark } = useAppTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text, fontWeight: "600", fontSize: 17 },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false, title: "Home" }}
        />
        <Stack.Screen name="scan" options={{ title: "Scan barcode", presentation: "modal" }} />
        <Stack.Screen
          name="receipt-import"
          options={{
            title: "Receipt or invoice",
            headerBackTitle: "Pantry",
            headerBackButtonDisplayMode: "minimal",
          }}
        />
        <Stack.Screen
          name="shopping-list/[listId]"
          options={{
            title: "Shopping list",
            headerBackTitle: "Shop",
            headerBackButtonDisplayMode: "minimal",
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: "Settings",
            headerBackButtonDisplayMode: "minimal",
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ServerSettingsProvider>
          <UserPreferencesProvider>
            <RootStack />
          </UserPreferencesProvider>
        </ServerSettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
