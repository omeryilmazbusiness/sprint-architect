import { Platform } from "react-native";
import Constants from "expo-constants";
import { apiRequest } from "@/lib/query-client";
import { canUsePushNotifications, isExpoGo } from "./environment";

/**
 * Requests push-notification permission, fetches an Expo push token,
 * and registers it with the backend at the given endpoint.
 *
 * Environment behaviour:
 * - Web                  → skipped (no native module).
 * - Expo Go (any OS)     → skipped (push tokens unavailable in Expo Go).
 * - Dev build            → registers if EAS projectId is present.
 * - Production build     → registers; failure is logged, not thrown.
 *
 * Safety: NO top-level expo-notifications import — dynamic import inside
 * the function body, after the environment guard. This means Android Expo Go
 * never loads the native module and therefore never crashes.
 *
 * All errors are caught; token registration failure is non-fatal so the
 * rest of the app continues working.
 */
export async function registerPushToken(endpoint: string): Promise<void> {
  if (!canUsePushNotifications()) {
    console.log(
      `[Push] Skipped — ${isExpoGo ? "Expo Go" : Platform.OS === "web" ? "web" : "unsupported"} environment.`,
    );
    return;
  }

  try {
    const Notifications = await import("expo-notifications");

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[Push] Permission not granted — skipping token registration.");
      return;
    }

    const projectId: string | undefined =
      (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
      (Constants.easConfig?.projectId as string | undefined);

    if (!projectId) {
      console.log("[Push] No EAS projectId found — skipping token registration.");
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    const platform: "ios" | "android" = Platform.OS === "ios" ? "ios" : "android";

    await apiRequest("POST", endpoint, { token, platform });
    console.log(`[Push] Token registered at ${endpoint}:`, token.slice(0, 20) + "…");
  } catch (err) {
    console.warn(`[Push] Failed to register push token at ${endpoint}:`, err);
  }
}
