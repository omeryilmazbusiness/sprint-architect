import { Stack } from "expo-router";
import React from "react";

export default function PatientLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="dashboard" />
    </Stack>
  );
}
