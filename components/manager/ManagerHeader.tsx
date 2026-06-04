import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/context/LanguageContext";
import { LOCALE_FLAGS } from "@/i18n";
import { LanguageSelectorSheet } from "@/components/admin/LanguageSelectorSheet";
import { BrandLogo } from "@/components/common/BrandLogo";
import { frameDisplayText } from "@/lib/frameDisplayText";

interface ManagerHeaderProps {
  title: string;
  subtitle?: string;
  onLogout?: () => void;
  right?: React.ReactNode;
  backButton?: boolean;
  onBack?: () => void;
  onNotifications?: () => void;
  unreadCount?: number;
}

export function ManagerHeader({
  title,
  subtitle,
  onLogout,
  right,
  backButton,
  onBack,
  onNotifications,
  unreadCount: propUnreadCount,
}: ManagerHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { locale } = useLanguage();
  const [showLang, setShowLang] = useState(false);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/v1/manager/notifications/unread-count"],
    enabled: propUnreadCount === undefined,
  });

  const unreadCount = propUnreadCount ?? unreadData?.count ?? 0;

  const handleNotifications = () => {
    if (onNotifications) {
      onNotifications();
    } else {
      router.push("/(manager)/notifications" as any);
    }
  };

  return (
    <>
      <View style={[styles.header, { paddingTop: topPad + 10 }, cardShadow]}>
        <View style={styles.row}>
          {backButton ? (
            <Pressable
              style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
              onPress={onBack}
              hitSlop={10}
            >
              <Ionicons name="arrow-back" size={22} color={T.primary} />
            </Pressable>
          ) : (
            <BrandLogo variant="header" />
          )}

          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {frameDisplayText(subtitle)}
              </Text>
            ) : null}
          </View>

          <View style={styles.rightArea}>
            {/* Language switcher */}
            <Pressable
              style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.65 : 1 }]}
              onPress={() => setShowLang(true)}
              hitSlop={8}
              accessibilityLabel="Switch language"
            >
              <Text style={styles.langFlag}>{LOCALE_FLAGS[locale]}</Text>
            </Pressable>

            {/* Notifications bell */}
            <Pressable
              style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
              onPress={handleNotifications}
              hitSlop={8}
            >
              <Ionicons name="notifications-outline" size={22} color={T.text} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>

            {right}

            {onLogout && (
              <Pressable
                style={({ pressed }) => [styles.logoutBtn, { opacity: pressed ? 0.6 : 1 }]}
                onPress={onLogout}
                hitSlop={8}
              >
                <Ionicons name="log-out-outline" size={20} color={T.textMuted} />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <LanguageSelectorSheet visible={showLang} onClose={() => setShowLang(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: T.surface,
    paddingHorizontal: T.sp16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
  },
  backBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    color: T.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
  rightArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    padding: 4,
    position: "relative",
  },
  langFlag: {
    fontSize: 20,
    lineHeight: 24,
  },
  logoutBtn: {
    padding: 4,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: T.danger,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: T.surface,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "PlusJakartaSans_700Bold",
  },
});
