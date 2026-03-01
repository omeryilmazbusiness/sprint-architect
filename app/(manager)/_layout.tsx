import { Stack } from "expo-router";
import { AdminThemeProvider } from "@/context/AdminThemeContext";

export default function ManagerLayout() {
  return (
    <AdminThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AdminThemeProvider>
  );
}
