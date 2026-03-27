import { Stack, Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";

/**
 * Guest Stack group — used for detail / drilldown screens that open above the
 * tab bar (e.g. document detail, appointment detail).  The tab bar lives in
 * app/(patient)/_layout.tsx.
 */
export default function GuestStackLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user || user.role !== "PATIENT") return <Redirect href="/(auth)/login" />;

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
