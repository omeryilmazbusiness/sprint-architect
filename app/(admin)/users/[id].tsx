import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
  Linking,
  Modal,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusPill, LoadingState, ErrorState, Divider } from "@/components/ui";
import { getUser, deactivateSingleUser, resetUserPasswordAuto, type AdminUser } from "@/lib/api/adminUsers";
import { useInvalidateAdminUsers } from "@/hooks/useAdminUsersQuery";
import { useAuth } from "@/context/AuthContext";
import { PurgeDangerSection } from "@/components/users/PurgeDangerSection";
import { useT } from "@/hooks/useT";

function InfoRow({ icon, label, value, onPress }: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.infoRow, onPress && { opacity: pressed ? 0.7 : 1 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={15} color={T.accent} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
      </View>
      {onPress && <Ionicons name="open-outline" size={13} color={T.textMuted} />}
    </Pressable>
  );
}

function ActionRow({ icon, label, destructive, onPress }: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.actionIcon, { backgroundColor: destructive ? T.dangerBg : T.accent + "12" }]}>
        <Ionicons name={icon} size={16} color={destructive ? T.danger : T.accent} />
      </View>
      <Text style={[styles.actionLabel, destructive && { color: T.danger }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={destructive ? T.danger + "80" : T.textMuted} />
    </Pressable>
  );
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, cardShadow, style]}>{children}</View>;
}

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(iso: string | null | undefined, neverLabel: string): string {
  if (!iso) return neverLabel;
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function getInitials(user: AdminUser): string {
  if (user.fullName) {
    const parts = user.fullName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return user.email.slice(0, 2).toUpperCase();
}

export default function UserDetailScreen() {
  const t = useT();
  const tu = t.adminUsers;
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const invalidateUsers = useInvalidateAdminUsers();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<AdminUser>({
    queryKey: ["/v1/admin/users", id],
    queryFn: () => getUser(id),
  });

  async function handleDeactivate() {
    if (!data) return;
    setIsDeactivating(true);
    try {
      await deactivateSingleUser(id, data.role as "ADMIN" | "MANAGER");
      setShowDeactivate(false);
      await invalidateUsers();
      qc.removeQueries({ queryKey: ["/v1/admin/users", id] });
      router.back();
    } catch (e: any) {
      setShowDeactivate(false);
      Alert.alert("Cannot Deactivate", e?.message ?? "Deactivation failed");
    } finally {
      setIsDeactivating(false);
    }
  }

  async function handlePurged() {
    await invalidateUsers();
    qc.removeQueries({ queryKey: ["/v1/admin/users", id] });
    router.back();
  }

  async function handleResetPassword() {
    if (!data) return;
    setIsResetting(true);
    try {
      const result = await resetUserPasswordAuto(id);
      setShowReset(false);
      setNewPassword(result.generatedPassword);
      setShowPasswordModal(true);
      await refetch();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to reset password");
    } finally {
      setIsResetting(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.root}>
        <AdminHeader title={tu.userDetailTitle} backButton onBack={() => router.back()} />
        <LoadingState message={tu.loadingUser} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.root}>
        <AdminHeader title={tu.userDetailTitle} backButton onBack={() => router.back()} />
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  const displayName = data.fullName ?? data.email;
  const initials = getInitials(data);
  const hasClinic = !!data.clinic;
  const hasPhone = !!data.phoneE164;
  const isInactive = data.status === "INACTIVE";

  return (
    <View style={styles.root}>
      <AdminHeader
        title={tu.userDetailTitle}
        backButton
        onBack={() => router.back()}
        right={<StatusPill status={data.status} small />}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard style={styles.heroCard}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroInitials}>{initials}</Text>
          </View>
          <Text style={styles.heroName} numberOfLines={2}>{displayName}</Text>
          {data.fullName && (
            <Text style={styles.heroEmail} numberOfLines={1}>{data.email}</Text>
          )}
          <View style={styles.heroChips}>
            <View style={styles.roleChip}>
              <Text style={styles.roleChipText}>{data.role}</Text>
            </View>
            {data.mustChangePassword && (
              <View style={styles.warningChip}>
                <Ionicons name="warning-outline" size={11} color="#B45309" />
                <Text style={styles.warningChipText}>{tu.mustChangePassword}</Text>
              </View>
            )}
          </View>
          {data.statusReason && isInactive && (
            <View style={styles.statusReasonBadge}>
              <Ionicons name="information-circle-outline" size={13} color={T.textSec} />
              <Text style={styles.statusReasonText}>{data.statusReason.replace(/_/g, " ")}</Text>
            </View>
          )}
        </SectionCard>

        <SectionLabel text={tu.contactSection} />
        <SectionCard>
          <InfoRow
            icon="mail-outline"
            label={tu.emailLabel}
            value={data.email}
            onPress={() => Linking.openURL(`mailto:${data.email}`)}
          />
          {hasPhone && (
            <>
              <Divider inset={44} />
              <InfoRow
                icon="call-outline"
                label={tu.phoneLabel}
                value={data.phoneE164!}
                onPress={() => Linking.openURL(`tel:${data.phoneE164}`)}
              />
            </>
          )}
        </SectionCard>

        {hasClinic && (
          <>
            <SectionLabel text={tu.clinicSection} />
            <SectionCard>
              <View style={styles.clinicRow}>
                <View style={styles.clinicIcon}>
                  <Ionicons name="business-outline" size={16} color={T.primary} />
                </View>
                <View style={styles.clinicInfo}>
                  <Text style={styles.clinicName}>{data.clinic!.name}</Text>
                  <View style={styles.clinicMeta}>
                    <StatusPill status={data.clinic!.status} small />
                  </View>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.openClinicBtn, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => router.push({
                    pathname: "/(admin)/clinics/[id]",
                    params: { id: data.clinicId! },
                  })}
                >
                  <Text style={styles.openClinicText}>{tu.openClinic}</Text>
                  <Ionicons name="arrow-forward" size={12} color={T.accent} />
                </Pressable>
              </View>
            </SectionCard>
          </>
        )}

        <SectionLabel text={tu.accountSection} />
        <SectionCard>
          <InfoRow
            icon="calendar-outline"
            label={tu.memberSince}
            value={formatDate(data.createdAt)}
          />
          <Divider inset={44} />
          <InfoRow
            icon="time-outline"
            label={tu.lastLogin}
            value={formatDateTime(data.lastLoginAt, tu.never)}
          />
        </SectionCard>

        <SectionLabel text={tu.actionsSection} />
        <SectionCard style={styles.actionsCard}>
          <ActionRow
            icon="key-outline"
            label={tu.resetPassword}
            onPress={() => setShowReset(true)}
          />
          {!isInactive && (
            <>
              <Divider inset={52} />
              <ActionRow
                icon="ban-outline"
                label={tu.deactivateUser}
                destructive
                onPress={() => setShowDeactivate(true)}
              />
            </>
          )}
        </SectionCard>

        {isSuperAdmin && (
          <PurgeDangerSection user={data} onPurged={handlePurged} />
        )}
      </ScrollView>

      <Modal visible={showDeactivate} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={[styles.modalIcon, { backgroundColor: T.dangerBg }]}>
              <Ionicons name="ban-outline" size={26} color={T.danger} />
            </View>
            <Text style={styles.modalTitle}>{tu.deactivateTitle}</Text>
            <Text style={styles.modalBody}>
              {tu.deactivateBody.replace("{name}", displayName)}
            </Text>
            <Text style={styles.modalNote}>
              {tu.deactivateNote}
            </Text>
            <View style={styles.modalBtns}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setShowDeactivate(false)}
                disabled={isDeactivating}
              >
                <Text style={styles.cancelBtnText}>{tu.cancel}</Text>
              </Pressable>
              <Pressable
                style={[styles.deactivateBtn, { opacity: isDeactivating ? 0.7 : 1 }]}
                onPress={handleDeactivate}
                disabled={isDeactivating}
              >
                {isDeactivating
                  ? <ActivityIndicator color={T.danger} size="small" />
                  : <Text style={styles.deactivateBtnText}>{tu.deactivate}</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showReset} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={[styles.modalIcon, { backgroundColor: T.accent + "12" }]}>
              <Ionicons name="key-outline" size={26} color={T.accent} />
            </View>
            <Text style={styles.modalTitle}>{tu.resetPasswordTitle}</Text>
            <Text style={styles.modalBody}>
              {tu.resetPasswordBody.replace("{name}", displayName)}
            </Text>
            <View style={styles.modalBtns}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setShowReset(false)}
                disabled={isResetting}
              >
                <Text style={styles.cancelBtnText}>{tu.cancel}</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, { opacity: isResetting ? 0.7 : 1 }]}
                onPress={handleResetPassword}
                disabled={isResetting}
              >
                {isResetting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.confirmBtnText}>{tu.reset}</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={[styles.modalIcon, { backgroundColor: "#D1FAE5" }]}>
              <Ionicons name="checkmark-circle-outline" size={26} color="#059669" />
            </View>
            <Text style={styles.modalTitle}>{tu.passwordResetTitle}</Text>
            <Text style={styles.modalBody}>{tu.passwordResetBody.replace("{name}", displayName)}</Text>
            <View style={styles.passwordBox}>
              <Text style={styles.passwordText} selectable>{newPassword ?? ""}</Text>
            </View>
            <Text style={styles.modalNote}>{tu.passwordCopyNote}</Text>
            <Pressable
              style={[styles.confirmBtn, { width: "100%" }]}
              onPress={() => { setShowPasswordModal(false); setNewPassword(null); }}
            >
              <Text style={styles.confirmBtnText}>{tu.done}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },

  heroCard: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
    marginBottom: 4,
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroInitials: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: "#fff",
  },
  heroName: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: T.text,
    textAlign: "center",
  },
  heroEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textMuted,
  },
  heroChips: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: T.primary + "12",
    borderWidth: 1,
    borderColor: T.primary + "30",
  },
  roleChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: T.primary,
  },
  warningChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  warningChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#B45309",
  },
  statusReasonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: T.r8,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
  },
  statusReasonText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textSec,
    textTransform: "capitalize",
  },

  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.6,
    color: T.textMuted,
    marginTop: 8,
    marginBottom: 2,
    paddingHorizontal: 4,
  },

  card: {
    backgroundColor: T.surface,
    borderRadius: T.r14,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  actionsCard: {},

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  infoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: T.r8,
    backgroundColor: T.accent + "12",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoText: { flex: 1 },
  infoLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: T.textMuted,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: T.text,
  },

  clinicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  clinicIcon: {
    width: 36,
    height: 36,
    borderRadius: T.r10,
    backgroundColor: T.primary + "10",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  clinicInfo: { flex: 1 },
  clinicName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: T.text,
    marginBottom: 4,
  },
  clinicMeta: { flexDirection: "row" },
  openClinicBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: T.r8,
    borderWidth: 1,
    borderColor: T.accent + "40",
    backgroundColor: T.accent + "08",
  },
  openClinicText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: T.accent,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: T.r8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionLabel: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: T.text,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  modal: {
    backgroundColor: T.surface,
    borderRadius: T.r20,
    padding: 24,
    width: "88%",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  modalIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: T.text,
  },
  modalBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.textSec,
    textAlign: "center",
    lineHeight: 21,
  },
  modalNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
    textAlign: "center",
    fontStyle: "italic",
  },
  modalBtns: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: T.r10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: T.border,
  },
  cancelBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: T.textSec,
  },
  deactivateBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: T.r10,
    alignItems: "center",
    backgroundColor: T.dangerBg,
    borderWidth: 1.5,
    borderColor: T.dangerBorder,
  },
  deactivateBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: T.danger,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: T.r10,
    alignItems: "center",
    backgroundColor: T.primary,
  },
  confirmBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#fff",
  },
  passwordBox: {
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: T.r10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
  },
  passwordText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: T.primary,
    letterSpacing: 2,
  },
});
