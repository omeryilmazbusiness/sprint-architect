import { useEffect } from "react";
import { Platform } from "react-native";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, Redirect } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminThemeProvider } from "@/context/AdminThemeContext";
import { T } from "@/constants/adminTheme";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/hooks/useT";
import { registerPushToken } from "@/lib/notifications/registerPushToken";

function NativeTabLayout() {
  const t = useT();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="dashboard">
        <Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} />
        <Label>{t.adminTabLabels.dashboard}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="clinics">
        <Icon sf={{ default: "building.2", selected: "building.2.fill" }} />
        <Label>{t.adminTabLabels.clinics}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="users">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>{t.adminTabLabels.users}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="invoices">
        <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
        <Label>{t.adminTabLabels.invoices}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>{t.adminTabLabels.settings}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const t = useT();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: T.primary,
        tabBarInactiveTintColor: T.textMuted,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : T.surface,
          borderTopWidth: 1,
          borderTopColor: T.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: T.surface }]} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t.adminTabLabels.dashboard,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clinics"
        options={{
          title: t.adminTabLabels.clinics,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: t.adminTabLabels.users,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: t.adminTabLabels.invoices,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.adminTabLabels.settings,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ href: null }}
      />
    </Tabs>
  );
}

export default function AdminTabLayout() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
      registerPushToken("/v1/admin/device-token");
    }
  }, [user?.id]);

  if (isLoading) return null;
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return <Redirect href="/(auth)/login" />;

  const Layout = isLiquidGlassAvailable() ? NativeTabLayout : ClassicTabLayout;
  return (
    <AdminThemeProvider>
      <Layout />
    </AdminThemeProvider>
  );
}
