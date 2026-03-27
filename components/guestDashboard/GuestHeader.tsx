import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";
import { useGuestNotifications } from "@/hooks/guest/useGuestNotifications";

interface Props {
  patientName?: string;
  onLogout?: () => void;
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function GuestHeader({ patientName, onLogout }: Props) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { unread } = useGuestNotifications();

  return (
    <View style={[styles.container, { paddingTop: topPad + 12 }]}>
      {/* Left: date + name */}
      <View style={styles.left}>
        <Text style={styles.date}>{todayLabel()}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {patientName ? `Hello, ${patientName.split(" ")[0]}` : "Welcome"}
        </Text>
      </View>

      {/* Right: bell + logout */}
      <View style={styles.actions}>
        {/* Notifications bell */}
        <Pressable style={styles.iconBtn} hitSlop={10} onPress={() => {}}>
          <Ionicons name="notifications-outline" size={20} color={T.textSec} />
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeTxt}>{unread > 99 ? "99+" : unread}</Text>
            </View>
          ) : null}
        </Pressable>

        {/* Logout */}
        <Pressable onPress={onLogout} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="log-out-outline" size={20} color={T.textSec} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: T.sp20,
    paddingBottom: T.sp16,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  left: { flex: 1, marginRight: 12 },
  date: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
    marginBottom: 3,
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: T.text,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: T.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: T.surface,
  },
  badgeTxt: {
    fontFamily: "Inter_700Bold",
    fontSize: 8,
    color: "#fff",
  },
});
