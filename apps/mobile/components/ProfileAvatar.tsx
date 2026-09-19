import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { ThemeColors } from "@/constants/theme";
import { typography } from "@/constants/theme";

type ProfileAvatarProps = {
  colors: ThemeColors;
  username: string;
  photoUri: string | null;
  size?: number;
  onPress?: () => void;
};

function profileInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
  }
  return trimmed.charAt(0).toUpperCase();
}

export function ProfileAvatar({
  colors,
  username,
  photoUri,
  size = 72,
  onPress,
}: ProfileAvatarProps) {
  const radius = size / 2;
  const initial = profileInitial(username);

  const content = photoUri ? (
    <Image
      source={{ uri: photoUri }}
      style={{ width: size, height: size, borderRadius: radius }}
      accessibilityLabel="Profile photo"
    />
  ) : (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: colors.primaryMuted,
        },
      ]}
    >
      <Text style={[styles.initial, { color: colors.primary, fontSize: size * 0.38 }]}>
        {initial}
      </Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Change profile photo"
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.85 }]}
    >
      {content}
      <View style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
        <Ionicons name="camera" size={14} color={colors.onPrimary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative" },
  fallback: { alignItems: "center", justifyContent: "center" },
  initial: { ...typography.headline },
  badge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
