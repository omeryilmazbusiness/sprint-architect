import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T } from "@/constants/adminTheme";
import { useGuestNotifications } from "@/hooks/guest/useGuestNotifications";
import { useT } from "@/hooks/useT";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSwitcherButton } from "@/components/common/LanguageSwitcherButton";

interface Props {
  patientName?: string;
  onLogout?: () => void;
}

function todayLabel(locale: string) {
  const l = locale === "ru" ? "ru-RU" : "en-US";
  return new Date().toLocaleDateString(l, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function GuestHeader({ patientName, onLogout }: Props) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { unread } = useGuestNotifications();
  const { locale } = useLanguage();
  const t = useT();
  const tg = t.guestDashboard;

  const greeting = patientName
    ? tg.greetHello.replace("{name}", patientName.split(" ")[0])
    : tg.greetWelcome;

  function openNotifications() {
    router.push("/(patient)/notifications");
  }

  return (
    <View style={[styles.container, { paddingTop: topPad + 14 }]}>
      {/* Left: greeting */}
      <View style={styles.left}>
        <Text style={styles.date}>{todayLabel(locale)}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {greeting}
        </Text>
      </View>

      {/* Right: actions */}
      <View style={styles.actions}>
        <LanguageSwitcherButton />

        <Pressable
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
          hitSlop={10}
          onPress={openNotifications}
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

        <Pressable
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
          hitSlop={10}
          onPress={onLogout}
          accessibilityLabel="Log out"
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={21} color={T.text} />
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
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: T.surface,
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
  left: { flex: 1, marginRight: 16 },
  date: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  name: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 24,
    color: T.text,
    letterSpacing: -0.3,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
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
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 8,
    color: "#fff",
  },
});
