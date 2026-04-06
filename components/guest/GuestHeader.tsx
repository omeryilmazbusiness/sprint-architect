import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";
import { useGuestNotifications } from "@/hooks/guest/useGuestNotifications";

interface GuestHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  hideNotifications?: boolean;
}

function NotificationBell() {
  const { unread } = useGuestNotifications();
  return (
    <Pressable
      style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
      hitSlop={12}
      onPress={() => router.push("/(patient)/notifications")}
      accessibilityLabel="Notifications"
      accessibilityRole="button"
    >
      <Ionicons name="notifications-outline" size={21} color={T.text} />
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>{unread > 99 ? "99+" : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function GuestHeader({
  title,
  subtitle,
  onBack,
  hideNotifications = false,
}: GuestHeaderProps) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={[styles.header, { paddingTop: topPad }]}>
      <View style={styles.inner}>
        {/* Left — back or spacer */}
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
            hitSlop={12}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={21} color={T.text} />
          </Pressable>
        ) : (
          <View style={styles.side} />
        )}

        {/* Center */}
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right — notifications or spacer */}
        <View style={styles.side}>
          {!hideNotifications ? <NotificationBell /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: T.surface,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
      default: {
        borderBottomWidth: 1,
        borderBottomColor: T.border,
      },
    }),
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 54,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  side: {
    width: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: T.text,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: T.textMuted,
    marginTop: 2,
    textAlign: "center",
  },
  badge: {
    position: "absolute",
    top: 7,
    right: 7,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: T.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: T.surface,
  },
  badgeTxt: {
    fontFamily: "Inter_700Bold",
    fontSize: 8,
    color: "#fff",
  },
});
