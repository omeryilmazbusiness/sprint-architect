import { useEffect } from "react";
import { Stack, Redirect } from "expo-router";
import { AdminThemeProvider } from "@/context/AdminThemeContext";
import { useAuth } from "@/context/AuthContext";
import { registerPushToken } from "@/lib/notifications/registerPushToken";

export default function ManagerLayout() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (user && user.role === "MANAGER") {
      registerPushToken("/v1/manager/device-token");
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
