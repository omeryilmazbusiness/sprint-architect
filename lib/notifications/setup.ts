import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

let _handlerInstalled = false;

/**
 * Installs the global notification handler exactly once.
 *
 * Safe to call on any platform and in any environment (Expo Go, dev build,
 * standalone). On Android in Expo Go (SDK 53+) remote push is unsupported
 * and expo-notifications will throw — the try/catch keeps the app alive.
 */
export function initNotificationHandler(): void {
  if (_handlerInstalled) return;
  if (Platform.OS === "web") return;
  _handlerInstalled = true;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (err) {
    console.warn("[Notifications] setNotificationHandler failed (Expo Go limitation on Android):", err);
  }
}
