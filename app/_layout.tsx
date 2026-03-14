import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient, setSystemErrorHandler } from "@/lib/query-client";
import { AuthProvider } from "@/context/AuthContext";
import { SystemErrorProvider, useSystemError } from "@/context/SystemErrorContext";
import { MaintenanceBottomSheet } from "@/components/system/MaintenanceBottomSheet";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";

SplashScreen.preventAutoHideAsync();

function SystemErrorBridge() {
  const { showSystemError } = useSystemError();
  useEffect(() => {
    setSystemErrorHandler(showSystemError);
  }, [showSystemError]);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

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
            <SystemErrorProvider>
              <SystemErrorBridge />
              <AuthProvider>
                <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(patient)" />
                  <Stack.Screen name="(manager)" />
                  <Stack.Screen name="(admin)" />
                </Stack>
              </AuthProvider>
              <MaintenanceBottomSheet />
            </SystemErrorProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
