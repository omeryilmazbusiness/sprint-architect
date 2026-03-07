import { Stack, Redirect } from "expo-router";
import { AdminThemeProvider } from "@/context/AdminThemeContext";
import { useAuth } from "@/context/AuthContext";

export default function ManagerLayout() {
  const { user, isLoading } = useAuth();

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
