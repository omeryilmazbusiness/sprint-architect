import { Platform } from "react-native";
import Constants from "expo-constants";
import { apiRequest } from "@/lib/query-client";

/**
 * Requests notification permissions, fetches an Expo push token, and
 * registers it with the backend at the given endpoint.
 *
 * Fully safe to call in any environment:
 *  - Skips silently on web.
 *  - Handles permission denied gracefully.
 *  - Uses dynamic import so Android Expo Go (SDK 53+, which removed remote
 *    push from Expo Go) never crashes at module-load time.
 */
export async function registerPushToken(endpoint: string): Promise<void> {
  try {
    if (Platform.OS === "web") return;

    // Dynamic import avoids the top-level crash on Android Expo Go SDK 53+
    // (expo-notifications throws during module initialisation there).
    const Notifications = await import("expo-notifications");

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[Push] Permission not granted — skipping token registration");
      return;
    }

    const projectId: string | undefined =
      (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
      (Constants.easConfig?.projectId as string | undefined);

    if (!projectId) {
      console.log("[Push] No projectId found — skipping push token registration (expected in Expo Go dev mode)");
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

    const token = tokenData.data;
    const platform: "ios" | "android" = Platform.OS === "ios" ? "ios" : "android";

    await apiRequest("POST", endpoint, { token, platform });
    console.log(`[Push] Token registered at ${endpoint}:`, token.slice(0, 20) + "...");
  } catch (err) {
    console.warn(`[Push] Failed to register push token at ${endpoint}:`, err);
  }
}
