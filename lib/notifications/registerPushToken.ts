import * as Notifications from "expo-notifications";
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
 *  - Catches expo-notifications errors caused by Expo Go limitations on
 *    Android (SDK 53+ dropped remote-push support in Expo Go).
 */
export async function registerPushToken(endpoint: string): Promise<void> {
  try {
    if (Platform.OS === "web") return;

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

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    const token = tokenData.data;
    const platform: "ios" | "android" = Platform.OS === "ios" ? "ios" : "android";

    await apiRequest("POST", endpoint, { token, platform });
    console.log(`[Push] Token registered at ${endpoint}:`, token.slice(0, 20) + "...");
  } catch (err) {
    console.warn(`[Push] Failed to register push token at ${endpoint}:`, err);
  }
}
