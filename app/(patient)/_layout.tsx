import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, Redirect } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { T } from "@/constants/adminTheme";

const TAB_H      = 68;
const TAB_SIDE   = 14;
const TAB_RADIUS = 24;

// ─── NativeTabs path (iOS 26+ liquid glass) ──────────────────────────────────

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="dashboard">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>My Journey</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="track">
        <Icon sf={{ default: "map", selected: "map.fill" }} />
        <Label>Track</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="schedule">
        <Icon sf={{ default: "calendar", selected: "calendar.fill" }} />
        <Label>Schedule</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <Icon sf={{ default: "safari", selected: "safari.fill" }} />
        <Label>Explore</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person.circle", selected: "person.circle.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// ─── Classic path (Android / Web / iOS < 26) ─────────────────────────────────

type TabIconProps = { focused: boolean; color: string; size: number };

function tabIcon(
  outline: React.ComponentProps<typeof Ionicons>["name"],
  filled:  React.ComponentProps<typeof Ionicons>["name"],
) {
  return ({ focused, color, size }: TabIconProps) => (
    <Ionicons name={focused ? filled : outline} size={size} color={color} />
  );
}

function ClassicTabLayout() {
  const insets    = useSafeAreaInsets();
  const isIOS     = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";
  const isWeb     = Platform.OS === "web";

  const tabBottom = isWeb ? 0 : insets.bottom + 8;
  const tabHeight = isWeb ? 84 : TAB_H;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   T.accent,
        tabBarInactiveTintColor: T.textMuted,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
          marginBottom: isWeb ? 2 : 4,
        },
        tabBarStyle: {
          position:    "absolute",
          left:        isWeb ? 0 : TAB_SIDE,
          right:       isWeb ? 0 : TAB_SIDE,
          bottom:      tabBottom,
          height:      tabHeight,
          borderRadius: isWeb ? 0 : TAB_RADIUS,
          borderTopWidth: 0,
          backgroundColor: isAndroid
            ? "rgba(255,255,255,0.94)"
            : "transparent",
          overflow: "hidden",
          ...(isAndroid ? { elevation: 12 } : {}),
          ...(isIOS ? {
            shadowColor:   "#000",
            shadowOffset:  { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius:  20,
          } : {}),
          ...(isWeb ? {
            borderTopWidth:  1,
            borderTopColor:  T.border,
          } : {
            borderWidth:  1,
            borderColor:  isIOS
              ? "rgba(255,255,255,0.45)"
              : "rgba(0,0,0,0.06)",
          }),
        },
        tabBarBackground: () => {
          if (isIOS) {
            return (
              <BlurView
                intensity={75}
                tint="light"
                style={StyleSheet.absoluteFill}
              />
            );
          }
          if (isWeb) {
            return (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: T.surface }]} />
            );
          }
          return null;
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "My Journey", tabBarIcon: tabIcon("home-outline", "home") }}
      />
      <Tabs.Screen
        name="track"
        options={{ title: "Track", tabBarIcon: tabIcon("map-outline", "map") }}
      />
      <Tabs.Screen
        name="schedule"
        options={{ title: "Schedule", tabBarIcon: tabIcon("calendar-outline", "calendar") }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: "Explore", tabBarIcon: tabIcon("compass-outline", "compass") }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: tabIcon("person-outline", "person") }}
      />
    </Tabs>
  );
}

// ─── Root layout — role guard + path selection ────────────────────────────────

export default function PatientLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user || user.role !== "PATIENT") return <Redirect href="/(auth)/login" />;

  const Layout = isLiquidGlassAvailable() ? NativeTabLayout : ClassicTabLayout;
  return <Layout />;
}
