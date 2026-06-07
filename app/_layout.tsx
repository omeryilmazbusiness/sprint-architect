import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient, setSystemErrorHandler } from "@/lib/query-client";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { SystemErrorProvider, useSystemError } from "@/context/SystemErrorContext";
import { MaintenanceBottomSheet } from "@/components/system/MaintenanceBottomSheet";
import { useAppFonts } from "@/lib/fonts/FontLoader";
import { initNotificationHandler } from "@/lib/notifications/setup";
import { ensureAndroidChannels } from "@/lib/notifications/channels";
import StartupScreen from "@/components/StartupScreen";

// Prevent the native splash screen from auto-hiding before assets load.
// Wrapped in try/catch: on some Android configurations this call can throw
// (e.g. splash screen already hidden by OS, or Expo Go limitations).
try {
  SplashScreen.preventAutoHideAsync();
} catch {
  // Non-fatal: if the splash cannot be held the app still renders correctly.
}

// ─── Notification handler — installed once, before React renders ────────────
//
// Called at module scope so the handler is set before the first frame.
// This is important when the app is launched by tapping a push notification.
//
// initNotificationHandler() is:
//   - async (dynamic import) → no top-level expo-notifications evaluation,
//     so Android Expo Go SDK 53+ never crashes during module load.
//   - environment-guarded → skips silently on Android Expo Go / web.
//   - idempotent → safe to call multiple times (nop after first success).
//   - error-safe → catches all errors internally; failure is non-fatal.
//
// `void` discards the returned Promise intentionally (fire-and-forget).
void initNotificationHandler();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SystemErrorBridge() {
  const { showSystemError } = useSystemError();
  useEffect(() => {
    setSystemErrorHandler((info) =>
      showSystemError({
        code: info.code ?? "SYS-001",
        requestId: info.requestId,
        message: info.message,
      }),
    );
  }, [showSystemError]);
  return null;
}

/**
 * Sets up Android notification channels exactly once, after the component
 * tree has mounted.
 *
 * ensureAndroidChannels() is:
 *   - async + dynamic import → no module-level expo-notifications crash.
 *   - platform + environment guarded → no-op on iOS/web/Android Expo Go.
 *   - error-safe → catches all errors; channel failure is non-fatal.
 */
function NotificationInit() {
  useEffect(() => {
    void ensureAndroidChannels();
  }, []);
  return null;
}

// ─── Root layout ─────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide the native splash screen once fonts are ready (or have failed).
      // Wrapped in try/catch: on some Expo Go + Android builds this can throw.
      SplashScreen.hideAsync().catch(() => {
        // Non-fatal: StartupScreen still covers the UI.
      });
    }
  }, [fontsLoaded, fontError]);

  // Block rendering until fonts are ready or have errored.
  // fontError branch ensures the app still renders if font loading fails.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary
        onError={(error, stack) => {
          console.error("[ErrorBoundary]", error.message, stack);
        }}
      >
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <LanguageProvider>
                <SystemErrorProvider>
                  <NotificationInit />
                  <SystemErrorBridge />
                  <AuthProvider>
                    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
                      <Stack.Screen name="index" />
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="(auth)" />
                      <Stack.Screen name="(patient)" />
                      <Stack.Screen name="(guest)" />
                      <Stack.Screen name="(manager)" />
                      <Stack.Screen name="(manager-tabs)" />
                      <Stack.Screen name="(admin)" />
                    </Stack>
                  </AuthProvider>
                  <MaintenanceBottomSheet />
                  <StartupScreen />
                </SystemErrorProvider>
              </LanguageProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
