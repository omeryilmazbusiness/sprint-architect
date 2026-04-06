import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== "android") return;

  try {
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
  } catch (err) {
    console.warn("[Notifications] Failed to set up Android channels:", err);
  }
}
