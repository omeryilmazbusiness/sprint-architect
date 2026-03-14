import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { useAdminHeaderData } from "@/hooks/useAdminHeaderData";
import { AdminProfileMenu } from "./AdminProfileMenu";

interface AdminHeaderProps {
  title: string;
  userEmail?: string;
  onLogout?: () => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
  rightExtra?: React.ReactNode;
  backButton?: boolean;
  onBack?: () => void;
  showBell?: boolean;
}

function EnvChip({ label }: { label: "DEV" | "PROD" }) {
  const isProd = label === "PROD";
  return (
    <View
      style={[
        styles.chip,
        isProd ? styles.chipProd : styles.chipDev,
      ]}
    >
      <Text style={[styles.chipText, isProd ? styles.chipTextProd : styles.chipTextDev]}>
        {label}
      </Text>
    </View>
  );
}

function TzChip({ label }: { label: string }) {
  return (
    <View style={[styles.chip, styles.chipTz]}>
      <Ionicons name="time-outline" size={9} color={T.textMuted} style={{ marginRight: 2 }} />
      <Text style={[styles.chipText, styles.chipTextTz]}>{label}</Text>
    </View>
  );
}

function HealthDot({ ok, loaded }: { ok: boolean; loaded: boolean }) {
  const color = !loaded ? T.border : ok ? T.success : T.warning;
  return (
    <Pressable
      style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.65 : 1 }]}
      onPress={() => router.push("/(admin)/settings")}
      hitSlop={8}
    >
      <View style={[styles.healthDot, { backgroundColor: color }]} />
      {loaded && !ok && (
        <Text style={styles.degradedLabel}>!</Text>
      )}
    </Pressable>
  );
}

function NotifBell({ count }: { count: number }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.65 : 1 }]}
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

function ProfileBtn({
  initials,
  onPress,
}: {
  initials: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.profileBtn, { opacity: pressed ? 0.7 : 1 }]}
      onPress={onPress}
      hitSlop={4}
    >
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <Ionicons name="chevron-down" size={10} color={T.textMuted} />
    </Pressable>
  );
}

export function AdminHeader({
  title,
  userEmail,
  onLogout,
  left,
  right,
  rightExtra,
  backButton,
  onBack,
  showBell,
}: AdminHeaderProps) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [menuVisible, setMenuVisible] = useState(false);

  const data = useAdminHeaderData();
  const email = data.email || userEmail || "";
  const initials = email.length >= 2 ? email.slice(0, 2).toUpperCase() : "AD";

  const isBackMode = !!(backButton || left);

  const leftEl = left ?? (
    backButton ? (
      <Pressable
        style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.65 : 1 }]}
        onPress={onBack}
        hitSlop={10}
      >
        <Ionicons name="arrow-back" size={20} color={T.primary} />
      </Pressable>
    ) : (
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>H</Text>
      </View>
    )
  );

  const defaultRightEl = (
    <View style={styles.actionsRow}>
      {rightExtra && <View style={styles.extraSlot}>{rightExtra}</View>}
      <HealthDot ok={data.healthOk} loaded={data.healthLoaded} />
      <NotifBell count={data.unreadCount} />
      <ProfileBtn initials={initials} onPress={() => setMenuVisible(true)} />
    </View>
  );

  const rightEl = right !== undefined ? (
    <View style={styles.actionsRow}>{right}</View>
  ) : defaultRightEl;

  return (
    <>
      <View style={[styles.header, { paddingTop: topPad + 10 }, cardShadow]}>
        <View style={styles.row}>
          {leftEl}

          <View style={styles.titleBlock}>
            {!isBackMode && (
              <View style={styles.chipRow}>
                <EnvChip label={data.envLabel} />
                <TzChip label={data.cityLabel} />
              </View>
            )}
            <Text style={styles.pageTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>

          {rightEl}
        </View>
      </View>

      <AdminProfileMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        email={email}
        role={data.role}
        initials={initials}
      />
    </>
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
    fontSize: 15,
    color: "#fff",
  },
  titleBlock: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: T.r6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  chipDev: {
    backgroundColor: T.warningBg,
    borderColor: T.warningBorder,
  },
  chipProd: {
    backgroundColor: T.successBg,
    borderColor: T.successBorder,
  },
  chipTz: {
    backgroundColor: T.surfaceSubtle,
    borderColor: T.border,
  },
  chipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.3,
  },
  chipTextDev: {
    color: T.warningText,
  },
  chipTextProd: {
    color: T.successText,
  },
  chipTextTz: {
    color: T.textMuted,
  },
  pageTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: T.text,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    maxWidth: 210,
  },
  extraSlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: T.r8,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    flexShrink: 0,
  },
  healthDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  degradedLabel: {
    position: "absolute",
    top: 2,
    right: 4,
    fontFamily: "Inter_700Bold",
    fontSize: 8,
    color: T.warning,
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
  profileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.r8,
    paddingLeft: 4,
    paddingRight: 6,
    paddingVertical: 4,
    height: 36,
    flexShrink: 0,
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: "#fff",
  },
});
