import { Stack } from "expo-router";
import { T } from "@/constants/adminTheme";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: T.bg },
        animation: "slide_from_right",
      }}
    />
  );
}
