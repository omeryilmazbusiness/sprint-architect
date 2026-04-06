import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { T } from "@/constants/adminTheme";
import { useT } from "@/hooks/useT";

interface AdminProfileMenuProps {
  visible: boolean;
  onClose: () => void;
  email: string;
  role: string;
  initials: string;
}

type ConfirmState = null | "logout" | "logoutAll";

export function AdminProfileMenu({
  visible,
  onClose,
  email,
  role,
  initials,
}: AdminProfileMenuProps) {
  const t = useT();
  const tm = t.adminProfileMenu;
  const { logout } = useAuth();
  const slideAnim = useRef(new Animated.Value(320)).current;
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setConfirmState(null);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: Platform.OS !== "web",
        bounciness: 3,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 320,
        duration: 220,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    }
  }, [visible]);

  async function doLogout() {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await logout();
      onClose();
      router.replace("/(auth)/login");
    } finally {
      setIsBusy(false);
    }
  }

  async function doLogoutAll() {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await apiRequest("POST", "/v1/admin/auth/logout-all", {});
    } catch {
    } finally {
      await logout();
      onClose();
      router.replace("/(auth)/login");
      setIsBusy(false);
    }
  }

  function handleConfirm() {
    if (confirmState === "logout") doLogout();
    else if (confirmState === "logoutAll") doLogoutAll();
  }

  const roleBadgeColor =
    role === "SUPER_ADMIN" ? T.primary : role === "ADMIN" ? T.accent : T.textSec;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        <View style={styles.handle} />

        <View style={styles.profileSection}>
          <View style={styles.avatarLg}>
            <Text style={styles.avatarLgText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
            <View style={[styles.roleBadge, { borderColor: roleBadgeColor }]}>
              <Text style={[styles.roleText, { color: roleBadgeColor }]}>
                {role.replace("_", " ")}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {confirmState ? (
          <View style={styles.confirmArea}>
            <Ionicons
              name="warning-outline"
              size={22}
              color={T.warning}
              style={{ alignSelf: "center", marginBottom: 8 }}
            />
            <Text style={styles.confirmTitle}>
              {confirmState === "logout" ? tm.signOutConfirmTitle : tm.logoutAllConfirmTitle}
            </Text>
            <Text style={styles.confirmSub}>
              {confirmState === "logout" ? tm.signOutConfirmSub : tm.logoutAllConfirmSub}
            </Text>
            <View style={styles.confirmBtns}>
              <Pressable
                style={[styles.confirmBtn, styles.confirmBtnCancel]}
                onPress={() => setConfirmState(null)}
              >
                <Text style={styles.confirmBtnCancelText}>{tm.cancel}</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, styles.confirmBtnDanger, isBusy && styles.disabled]}
                onPress={handleConfirm}
                disabled={isBusy}
              >
                <Text style={styles.confirmBtnDangerText}>
                  {isBusy ? "…" : tm.confirm}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.menu}>
            <MenuItem
              icon="settings-outline"
              label={tm.settings}
              onPress={() => {
                onClose();
                router.push("/(admin)/settings");
              }}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="log-out-outline"
              label={tm.signOut}
              onPress={() => setConfirmState("logout")}
              danger
            />
            <MenuItem
              icon="phone-portrait-outline"
              label={tm.logoutAllDevices}
              onPress={() => setConfirmState("logoutAll")}
              danger
            />
          </View>
        )}

        <Pressable style={styles.cancelRow} onPress={onClose}>
          <Text style={styles.cancelText}>{tm.close}</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.65 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.menuIconWrap, danger && styles.menuIconDanger]}>
        <Ionicons name={icon} size={17} color={danger ? T.danger : T.primary} />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={T.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: T.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "web" ? 34 : 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  avatarLg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarLgText: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff" },
  profileInfo: { flex: 1, gap: 5 },
  profileEmail: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: T.text },
  roleBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: T.r6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleText: { fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.4 },
  divider: { height: 1, backgroundColor: T.border, marginHorizontal: 20 },
  menu: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 2 },
  menuDivider: { height: 1, backgroundColor: T.surfaceSubtle, marginVertical: 4 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 4,
    minHeight: 44,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: T.r8,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIconDanger: { backgroundColor: T.dangerBg, borderColor: T.dangerBorder },
  menuLabel: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, color: T.text },
  menuLabelDanger: { color: T.danger },
  confirmArea: { paddingHorizontal: 24, paddingVertical: 20 },
  confirmTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: T.text,
    textAlign: "center",
    marginBottom: 6,
  },
  confirmSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 19,
  },
  confirmBtns: { flexDirection: "row", gap: 12 },
  confirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: T.r10,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnCancel: {
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
  },
  confirmBtnDanger: { backgroundColor: T.danger },
  confirmBtnCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: T.text },
  confirmBtnDangerText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  disabled: { opacity: 0.5 },
  cancelRow: {
    marginTop: 8,
    marginHorizontal: 20,
    height: 48,
    borderRadius: T.r10,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: T.textSec },
});
