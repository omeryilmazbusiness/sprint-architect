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
      style={styles.iconBtn}
      hitSlop={10}
      onPress={() => {}}
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
            onPress={onBack ?? (() => router.back())}
            style={styles.iconBtn}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={22} color={T.text} />
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

        {/* Right — notifications */}
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
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingVertical: 10,
    minHeight: 52,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  side: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: T.text,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: T.textMuted,
    marginTop: 1,
    textAlign: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: T.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: T.surface,
  },
  badgeTxt: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: "#fff",
  },
});
