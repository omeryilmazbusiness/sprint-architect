import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { T, cardShadow } from "@/constants/adminTheme";

interface AdminHeaderProps {
  title: string;
  userEmail?: string;
  onLogout?: () => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
  backButton?: boolean;
  onBack?: () => void;
  showBell?: boolean;
}

function NotificationBell() {
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/v1/admin/notifications/unread-count"],
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
  const count = data?.count ?? 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.bellBtn, { opacity: pressed ? 0.6 : 1 }]}
      onPress={() => router.push("/(admin)/notifications")}
      hitSlop={8}
    >
      <Ionicons name="notifications-outline" size={20} color={T.primary} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? "99+" : String(count)}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function AdminHeader({
  title,
  userEmail,
  onLogout,
  left,
  right,
  backButton,
  onBack,
  showBell = false,
}: AdminHeaderProps) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "AD";

  const renderLeft = () => {
    if (left) return left;
    if (backButton) {
      return (
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={onBack}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={22} color={T.primary} />
        </Pressable>
      );
    }
    return (
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>H</Text>
      </View>
    );
  };

  return (
    <View style={[styles.header, { paddingTop: topPad + 10 }, cardShadow]}>
      <View style={styles.row}>
        {renderLeft()}

        <View style={styles.titleBlock}>
          {!backButton && !left && (
            <Text style={styles.brandText}>HealthTour</Text>
          )}
          <Text style={styles.pageTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.actions}>
          {right ?? (
            <>
              {showBell && <NotificationBell />}
              {userEmail ? (
                <>
                  <View style={styles.userChip}>
                    <View style={styles.avatarDot}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <Text style={styles.emailText} numberOfLines={1}>
                      {userEmail.split("@")[0]}
                    </Text>
                  </View>
                  {onLogout && (
                    <Pressable
                      style={({ pressed }) => [styles.logoutBtn, { opacity: pressed ? 0.6 : 1 }]}
                      onPress={onLogout}
                      hitSlop={8}
                    >
                      <Ionicons name="log-out-outline" size={20} color={T.textSec} />
                    </Pressable>
                  )}
                </>
              ) : null}
            </>
          )}
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: T.r8,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
    flexShrink: 0,
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: T.r8,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  brandMarkText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  titleBlock: {
    flex: 1,
    gap: 1,
  },
  brandText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: T.textMuted,
    letterSpacing: 0.5,
  },
  pageTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: T.text,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
    maxWidth: 200,
  },
  bellBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: T.r8,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: T.surface,
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: "#fff",
    lineHeight: 13,
  },
  userChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 20,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
    maxWidth: 110,
  },
  avatarDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: "#fff",
  },
  emailText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: T.text,
    flex: 1,
  },
  logoutBtn: {
    padding: 4,
  },
});
