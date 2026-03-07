import { Stack, Redirect } from "expo-router";
import React from "react";
import { useAuth } from "@/context/AuthContext";

export default function PatientLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user || user.role !== "PATIENT") return <Redirect href="/(auth)/login" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="dashboard" />
    </Stack>
  );
}
