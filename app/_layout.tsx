import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
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

// initNotificationHandler is idempotent, platform-guarded, and catches its
// own errors. Calling it here (outside the component) ensures it runs before
// the first frame, which is important for apps that can be launched via a
// push-notification tap.
initNotificationHandler();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SystemErrorBridge() {
  const { showSystemError } = useSystemError();
  useEffect(() => {
    setSystemErrorHandler(showSystemError);
  }, [showSystemError]);
  return null;
}

/**
 * Sets up Android notification channels exactly once, after the component
 * tree has mounted.  ensureAndroidChannels() is already platform-guarded and
 * catches its own errors — a failure here never crashes the app.
 */
function NotificationInit() {
  useEffect(() => {
    ensureAndroidChannels();
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
    <ErrorBoundary>
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
                {/* Cinematic welcome overlay — fades out after startup */}
                <StartupScreen />
              </SystemErrorProvider>
            </LanguageProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
