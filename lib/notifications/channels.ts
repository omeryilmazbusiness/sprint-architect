import { Platform } from "react-native";
import { canInitializeNotifications, isExpoGo } from "./environment";

/**
 * Creates the standard Android notification channels used by Healory.
 *
 * Channels are required on Android 8.0+ (API 26+). They control the
 * user-visible notification behaviour (sound, vibration, importance).
 *
 * Environment behaviour:
 * - Non-Android platforms  → skipped (no-op).
 * - Android Expo Go        → skipped (SDK 53+ native module unavailable).
 * - Android dev build      → channels created.
 * - Android production     → channels created.
 *
 * Safety: NO top-level expo-notifications import — dynamic import only.
 * All errors are caught; channel creation failure is non-fatal.
 */
export async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== "android") return;

  if (!canInitializeNotifications()) {
    console.log(
      `[Notifications] Android channels skipped — ${isExpoGo ? "Expo Go" : "unsupported"} environment.`,
    );
    return;
  }

  try {
    const Notifications = await import("expo-notifications");

    await Notifications.setNotificationChannelAsync("default", {
      name: "General",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
      showBadge: true,
      enableLights: true,
      lightColor: "#0369A1",
    });

    await Notifications.setNotificationChannelAsync("appointments", {
      name: "Appointments",
      description: "Appointment reminders and updates",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
      showBadge: true,
      enableLights: true,
      lightColor: "#0369A1",
    });

    await Notifications.setNotificationChannelAsync("documents", {
      name: "Documents",
      description: "Document assignments and status updates",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync("journey", {
      name: "Journey",
      description: "Journey and tracking updates",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
      showBadge: true,
    });

    console.log("[Notifications] Android channels configured.");
  } catch (err) {
    console.warn("[Notifications] Failed to set up Android channels:", err);
  }
}
