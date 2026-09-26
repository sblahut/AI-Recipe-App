import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { z } from "zod";

import { apiJson } from "@/lib/api";
import { ingredientSchema, type Ingredient } from "@/lib/schemas";

const CHANNEL_ID = "pantry-expiration";

function parseExpiryMs(expiresAt: string | null | undefined): number | null {
  if (!expiresAt?.trim()) {
    return null;
  }
  const ms = Date.parse(expiresAt);
  return Number.isNaN(ms) ? null : ms;
}

/** Schedule local notifications for items expiring within the reminder window. */
export async function syncExpirationReminders(
  items: Ingredient[],
  daysBefore: number | null,
): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  if (daysBefore == null || daysBefore < 1) {
    return;
  }

  const permission = await Notifications.getPermissionsAsync();
  let granted = permission.granted;
  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) {
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Pantry expiration",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const now = Date.now();
  const windowMs = daysBefore * 86_400_000;

  for (const item of items) {
    const expiryMs = parseExpiryMs(item.expires_at);
    if (expiryMs == null) {
      continue;
    }
    const notifyAt = expiryMs - daysBefore * 86_400_000;
    if (notifyAt <= now || expiryMs < now) {
      continue;
    }
    if (expiryMs - now > windowMs + 86_400_000) {
      continue;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Pantry expiration",
        body: `${item.name} expires soon — use it or update your pantry.`,
        data: { ingredientId: item.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(notifyAt),
        ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
      },
    });
  }
}

/** Reload pantry from the server and apply the current reminder schedule. */
export async function rescheduleExpirationRemindersFromServer(
  serverUrl: string,
  daysBefore: number | null,
): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  const raw = await apiJson<unknown>("/inventory", { baseUrl: serverUrl });
  const items = z.array(ingredientSchema).parse(raw);
  await syncExpirationReminders(items, daysBefore);
}
