import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * True when the app is running inside Expo Go (the store client).
 *
 * Expo Go on Android SDK 53+ removed remote push notification support.
 * Attempting to call expo-notifications APIs there throws at runtime.
 */
export const isExpoGo = Constants.executionEnvironment === "storeClient";

/**
 * True when running in a bare-workflow development build (Expo Dev Client).
 */
export const isDevBuild = Constants.executionEnvironment === "bare";

/**
 * True when running in a standalone (App Store / Play Store) production build.
 */
export const isProductionBuild = Constants.executionEnvironment === "standalone";

/**
 * Returns true when expo-notifications handler / channel APIs can be safely
 * called in the current environment.
 *
 * Rules:
 * - Web: never (no native module).
 * - Android Expo Go (SDK 53+): never — the native module throws.
 * - iOS Expo Go: safe for local-notification display.
 * - Dev builds and production builds (all platforms): safe.
 */
export function canInitializeNotifications(): boolean {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android" && isExpoGo) return false;
  return true;
}

/**
 * Returns true when remote push token registration is available.
 *
 * Remote push requires a real EAS project ID *and* a supported runtime.
 * Expo Go on any platform cannot register a real production push token.
 */
export function canUsePushNotifications(): boolean {
  if (Platform.OS === "web") return false;
  if (isExpoGo) return false;
  return true;
}
