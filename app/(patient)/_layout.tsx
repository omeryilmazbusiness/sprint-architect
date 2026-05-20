import { useEffect } from "react";
import { Platform } from "react-native";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, Redirect } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { T } from "@/constants/adminTheme";
import { TabBarMetricsProvider } from "@/components/layout/TabBarMetricsContext";
import { registerPushToken } from "@/lib/notifications/registerPushToken";
import { useT } from "@/hooks/useT";

const TAB_H      = 68;
const TAB_SIDE   = 14;
const TAB_RADIUS = 24;

// ─── NativeTabs path (iOS 26+ liquid glass) ───────────────────────────────────

function NativeTabLayout() {
  const t = useT();
  const tl = t.guestTabLabels;
  return (
    <TabBarMetricsProvider mode="native" bottomPadding={0}>
      <NativeTabs>
        <NativeTabs.Trigger name="dashboard">
          <Icon sf={{ default: "house", selected: "house.fill" }} />
          <Label>{tl.myJourney}</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="track">
          <Icon sf={{ default: "map", selected: "map.fill" }} />
          <Label>{tl.track}</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="schedule">
          <Icon sf={{ default: "calendar", selected: "calendar" }} />
          <Label>{tl.schedule}</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="explore">
          <Icon sf={{ default: "safari", selected: "safari.fill" }} />
          <Label>{tl.explore}</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <Icon sf={{ default: "person.circle", selected: "person.circle.fill" }} />
          <Label>{tl.profile}</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </TabBarMetricsProvider>
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
  const t = useT();
  const tl = t.guestTabLabels;
  const insets    = useSafeAreaInsets();
  const isIOS     = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";
  const isWeb     = Platform.OS === "web";

  const tabBottom = isWeb ? 0 : insets.bottom + 8;
  const tabHeight = isWeb ? 84 : TAB_H;

  const bottomPadding = isWeb
    ? 84
    : insets.bottom + 8 + TAB_H;

  return (
    <TabBarMetricsProvider mode="classic" bottomPadding={bottomPadding}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor:   T.accent,
          tabBarInactiveTintColor: T.textMuted,
          tabBarLabelStyle: {
            fontFamily: "PlusJakartaSans_500Medium",
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
              borderTopWidth: 0,
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
          options={{ title: tl.myJourney, tabBarIcon: tabIcon("home-outline", "home") }}
        />
        <Tabs.Screen
          name="track"
          options={{ title: tl.track, tabBarIcon: tabIcon("map-outline", "map") }}
        />
        <Tabs.Screen
          name="schedule"
          options={{ title: tl.schedule, tabBarIcon: tabIcon("calendar-outline", "calendar") }}
        />
        <Tabs.Screen
          name="explore"
          options={{ title: tl.explore, tabBarIcon: tabIcon("compass-outline", "compass") }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: tl.profile, tabBarIcon: tabIcon("person-outline", "person") }}
        />
        <Tabs.Screen
          name="notifications"
          options={{ href: null }}
        />
      </Tabs>
    </TabBarMetricsProvider>
  );
}

// ─── Root layout — role guard + push token registration ───────────────────────

export default function PatientLayout() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (user && user.role === "PATIENT") {
      registerPushToken("/v1/patient/device-token");
    }
  }, [user?.id]);

  if (isLoading) return null;
  if (!user || user.role !== "PATIENT") return <Redirect href="/(auth)/login" />;

  const Layout = isLiquidGlassAvailable() ? NativeTabLayout : ClassicTabLayout;
  return <Layout />;
}
