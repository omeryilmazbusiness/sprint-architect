import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { ManagerHeader } from "@/components/manager/ManagerHeader";
import { Card, SectionHeader, ListRow, Divider, StatusPill } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/hooks/useT";

interface ClinicInfo {
  id: string;
  name: string;
  status: string;
}

export default function ManagerSettingsScreen() {
  const { user, logout } = useAuth();
  const t = useT();
  const ts = t.managerSettings;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: clinic, isLoading } = useQuery<ClinicInfo>({
    queryKey: ["/v1/manager/clinic-info"],
  });

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  return (
    <View style={styles.root}>
      <ManagerHeader title={ts.pageTitle} subtitle={clinic?.name} onLogout={handleLogout} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.email ? user.email.slice(0, 2).toUpperCase() : "MG"}
              </Text>
            </View>
          </View>
          <Text style={styles.profileName}>{user?.fullName ?? "Manager"}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? "—"}</Text>
          <View style={styles.roleBadge}>
            <StatusPill status={user?.role ?? "MANAGER"} small />
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={T.accent} />
        ) : clinic ? (
          <>
            <SectionHeader label={ts.clinicSection} />
            <Card>
              <View style={styles.clinicRow}>
                <View style={[styles.clinicIcon, { backgroundColor: T.primary + "15" }]}>
                  <Ionicons name="business-outline" size={20} color={T.primary} />
                </View>
                <View style={styles.clinicInfo}>
                  <Text style={styles.clinicName}>{clinic.name}</Text>
                  <Text style={styles.clinicId}>ID: {clinic.id.slice(0, 8)}…</Text>
                </View>
                <StatusPill status={clinic.status} small />
              </View>
              {clinic.status === "SUSPENDED" && (
                <View style={styles.suspendedNote}>
                  <Ionicons name="warning-outline" size={16} color={T.dangerText} />
                  <Text style={styles.suspendedText}>{ts.suspendedNote}</Text>
                </View>
              )}
            </Card>
          </>
        ) : null}

        <SectionHeader label={ts.accountSection} style={styles.sectionGap} />
        <Card noPad>
          <ListRow
            icon="document-text-outline"
            label={ts.rowInvoices}
            subtitle={ts.rowInvoicesSub}
            onPress={() => router.push("/(manager-tabs)/invoices")}
          />
          <Divider inset={56} />
          <ListRow
            icon="people-outline"
            label={ts.rowGuests}
            subtitle={ts.rowGuestsSub}
            onPress={() => router.push("/(manager-tabs)/guests")}
          />
          <Divider inset={56} />
          <ListRow
            icon="layers-outline"
            label={ts.rowServices}
            subtitle={ts.rowServicesSub}
            onPress={() => router.push("/(manager-tabs)/services")}
          />
        </Card>

        <SectionHeader label={ts.supportSection} style={styles.sectionGap} />
        <Card noPad>
          <ListRow
            icon="help-circle-outline"
            label={ts.rowHelpSupport}
            subtitle={ts.rowHelpSupportSub}
            onPress={() =>
              Alert.alert(ts.rowHelpSupport, ts.alertHelpBody, [
                {
                  text: ts.alertOk,
                  onPress: () =>
                    Linking.openURL("mailto:support@healory.app").catch(() => {}),
                },
              ])
            }
          />
          <Divider inset={56} />
          <ListRow
            icon="shield-outline"
            label={ts.rowPrivacy}
            subtitle={ts.rowPrivacySub}
            onPress={() =>
              Alert.alert(ts.rowPrivacy, ts.alertPrivacyBody, [
                {
                  text: ts.alertOk,
                  onPress: () =>
                    Linking.openURL("https://omeryilmazbusiness.github.io/sprint-architect/privacy/").catch(() => {}),
                },
              ])
            }
          />
        </Card>

        <SectionHeader label={ts.sessionSection} style={styles.sectionGap} />
        <Card noPad>
          <ListRow
            icon="log-out-outline"
            label={ts.rowSignOut}
            danger
            onPress={handleLogout}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  content: { padding: T.sp16, gap: T.sp8 },
  profileCard: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    padding: T.sp24,
    alignItems: "center",
    gap: T.sp8,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: T.sp8,
    ...cardShadow,
  },
  avatarWrap: {
    marginBottom: T.sp4,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 22,
    color: "#fff",
  },
  profileName: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    color: T.text,
  },
  profileEmail: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: T.textMuted,
  },
  roleBadge: {
    marginTop: T.sp4,
  },
  clinicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
  },
  clinicIcon: {
    width: 40,
    height: 40,
    borderRadius: T.r10,
    alignItems: "center",
    justifyContent: "center",
  },
  clinicInfo: { flex: 1 },
  clinicName: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 15,
    color: T.text,
  },
  clinicId: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
  suspendedNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: T.sp8,
    marginTop: T.sp12,
    padding: T.sp12,
    backgroundColor: T.dangerBg,
    borderRadius: T.r8,
    borderWidth: 1,
    borderColor: T.dangerBorder,
  },
  suspendedText: {
    flex: 1,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: T.dangerText,
    lineHeight: 18,
  },
  sectionGap: { marginTop: T.sp8 },
});
