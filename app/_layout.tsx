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

SplashScreen.preventAutoHideAsync();

function SystemErrorBridge() {
  const { showSystemError } = useSystemError();
  useEffect(() => {
    setSystemErrorHandler(showSystemError);
  }, [showSystemError]);
  return null;
}

function NotificationInit() {
  useEffect(() => {
    initNotificationHandler();
    ensureAndroidChannels();
  }, []);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

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
                {/* Appears on every cold launch, fades out after ~2.3s */}
                <StartupScreen />
              </SystemErrorProvider>
            </LanguageProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
