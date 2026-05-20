import { canInitializeNotifications, isExpoGo } from "./environment";

let _handlerInstalled = false;

/**
 * Installs the global expo-notifications handler exactly once.
 *
 * This handler controls how received notifications are displayed while the
 * app is in the foreground (alert, sound, badge). It must be set before the
 * first notification arrives, so it is called at module scope in the root
 * layout — but safely, via async + dynamic import.
 *
 * Environment behaviour:
 * - Web                  → skipped (no native module).
 * - Android Expo Go      → skipped (SDK 53+ removed push from Expo Go).
 * - iOS Expo Go          → handler installed (local display still works).
 * - Dev build            → handler installed.
 * - Production build     → handler installed.
 *
 * Safety guarantees:
 * - NO top-level import of expo-notifications, so this module never crashes
 *   during bundle evaluation, regardless of runtime environment.
 * - Idempotent: subsequent calls after the first success are no-ops.
 * - All errors are caught and logged; failures are non-fatal.
 */
export async function initNotificationHandler(): Promise<void> {
  if (_handlerInstalled) return;

  if (!canInitializeNotifications()) {
    console.log(
      `[Notifications] Handler skipped — ${isExpoGo ? "Expo Go" : "web"} environment.`,
    );
    return;
  }

  try {
    const Notifications = await import("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    _handlerInstalled = true;
    console.log("[Notifications] Handler installed.");
  } catch (err) {
    console.warn("[Notifications] setNotificationHandler failed:", err);
  }
}
