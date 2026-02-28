import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

export default function AdminSettings() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "A";

  async function handleLogout() {
    setShowLogout(false);
    await logout();
    router.replace("/(auth)/login");
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 }]}>
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={[styles.avatarText, { fontFamily: "Inter_700Bold" }]}>{initials}</Text>
          </View>
          <View>
            <Text style={[styles.profileEmail, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
              {user?.email ?? "Admin"}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: colors.accent + "20" }]}>
              <Text style={[styles.roleText, { color: colors.accent, fontFamily: "Inter_600SemiBold" }]}>ADMIN</Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="business-outline" label="Clinics" colors={colors} onPress={() => router.push("/(admin)/clinics")} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow icon="people-outline" label="Users" colors={colors} onPress={() => router.push("/(admin)/users")} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow icon="document-text-outline" label="Invoices" colors={colors} onPress={() => router.push("/(admin)/invoices")} />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="log-out-outline"
            label="Sign Out"
            colors={colors}
            accent={colors.error}
            last
            onPress={() => setShowLogout(true)}
          />
        </View>
      </ScrollView>

      <Modal visible={showLogout} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Sign Out</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Are you sure you want to sign out?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => setShowLogout(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.error, borderColor: colors.error }]}
                onPress={handleLogout}
              >
                <Text style={[styles.modalBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>Sign Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SettingRow({ icon, label, colors, accent, last, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: typeof Colors.light;
  accent?: string;
  last?: boolean;
  onPress?: () => void;
}) {
  const c = accent ?? colors.accent;
  return (
    <Pressable
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }, last && { borderBottomWidth: 0 }]}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: c + "18" }]}>
        <Ionicons name={icon} size={18} color={c} />
      </View>
      <Text style={[styles.rowLabel, { color: label === "Sign Out" ? colors.error : colors.text, fontFamily: "Inter_500Medium" }]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  profileCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 20 },
  profileEmail: { fontSize: 15, marginBottom: 4 },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  roleText: { fontSize: 11, letterSpacing: 0.5 },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  divider: { height: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, fontSize: 15 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  modal: { borderRadius: 16, padding: 24, width: "85%", gap: 12 },
  modalTitle: { fontSize: 18 },
  modalSub: { fontSize: 14, lineHeight: 20 },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1 },
  modalBtnText: { fontSize: 15 },
});
