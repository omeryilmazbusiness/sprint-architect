import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminThemeProvider } from "@/context/AdminThemeContext";
import { T } from "@/constants/adminTheme";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="dashboard">
        <Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="guests">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Guests</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="services">
        <Icon sf={{ default: "square.stack", selected: "square.stack.fill" }} />
        <Label>Services</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="invoices">
        <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
        <Label>Invoices</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
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
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="guests"
        options={{
          title: "Guests",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: "Services",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="layers-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: "Invoices",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function ManagerTabLayout() {
  const Layout = isLiquidGlassAvailable() ? NativeTabLayout : ClassicTabLayout;
  return (
    <AdminThemeProvider>
      <Layout />
    </AdminThemeProvider>
  );
}
