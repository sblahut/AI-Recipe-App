import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

import { TabHeaderActions } from "@/components/TabHeaderActions";
import { typography } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

function tabIcon(name: IoniconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color} />;
  }
  TabIcon.displayName = `TabIcon(${name})`;
  return TabIcon;
}

export default function TabLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { ...typography.headline, color: colors.text },
        headerShadowVisible: false,
        headerRight: () => <TabHeaderActions />,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 0.5,
          paddingTop: 4,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.1,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Pantry", tabBarIcon: tabIcon("nutrition-outline") }}
      />
      <Tabs.Screen
        name="recipes"
        options={{ title: "Recipes", tabBarIcon: tabIcon("restaurant-outline") }}
      />
      <Tabs.Screen
        name="meal-plan"
        options={{ title: "Plan", tabBarIcon: tabIcon("calendar-outline") }}
      />
      <Tabs.Screen
        name="shopping"
        options={{ title: "Shop", tabBarIcon: tabIcon("cart-outline") }}
      />
    </Tabs>
  );
}
