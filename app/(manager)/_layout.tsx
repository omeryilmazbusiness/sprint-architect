import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack, Redirect } from "expo-router";
import { AdminThemeProvider } from "@/context/AdminThemeContext";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerManagerPushToken() {
  try {
    if (Platform.OS === "web") return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    const platform: "ios" | "android" = Platform.OS === "ios" ? "ios" : "android";

    await apiRequest("POST", "/v1/manager/device-token", { token, platform });
    console.log("[Push] Manager token registered:", token.slice(0, 20) + "...");
  } catch (err) {
    console.warn("[Push] Failed to register manager push token:", err);
  }
}

export default function ManagerLayout() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (user && user.role === "MANAGER") {
      registerManagerPushToken();
    }
  }, [user?.id]);

  if (isLoading) return null;
  if (!user || user.role !== "MANAGER") return <Redirect href="/(auth)/login" />;

  return (
    <AdminThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="notifications" options={{ presentation: "modal" }} />
      </Stack>
    </AdminThemeProvider>
  );
}
