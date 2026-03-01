import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  Card, SectionHeader, StatusPill, Divider, TextField, LoadingState, ErrorState,
  SecondaryButton, DestructiveButton,
} from "@/components/ui";
import { getUser, updateUser, deactivateUser, resetUserPassword, AdminUser, UpdateUserInput } from "@/lib/api/adminUsers";
import { listClinics, ClinicListResponse } from "@/lib/api/adminClinics";

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MANAGER">("MANAGER");
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "SUSPENDED">("ACTIVE");
  const [dirty, setDirty] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showClinicPicker, setShowClinicPicker] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<AdminUser>({
    queryKey: ["/v1/admin/users", id],
    queryFn: () => getUser(id),
  });

  const { data: clinicsData } = useQuery<ClinicListResponse>({
    queryKey: ["/v1/admin/clinics", ""],
    queryFn: () => listClinics({ pageSize: 100 }),
  });

  useEffect(() => {
    if (data) {
      setEmail(data.email);
      setRole(data.role);
      setClinicId(data.clinicId);
      setStatus(data.status);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const input: UpdateUserInput = { role, status };
      if (email !== data?.email) input.email = email.trim().toLowerCase();
      if (role === "MANAGER") input.clinicId = clinicId;
      else input.clinicId = null;
      return updateUser(id, input);
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["/v1/admin/users"] });
      setDirty(false);
      setEmail(updated.email);
      setRole(updated.role);
      setClinicId(updated.clinicId);
      setStatus(updated.status);
    },
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to save"),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateUser(id),
    onSuccess: () => {
      setShowDeactivate(false);
      qc.invalidateQueries({ queryKey: ["/v1/admin/users"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/metrics"] });
      router.back();
    },
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to deactivate"),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetUserPassword(id, newPassword),
    onSuccess: () => {
      setShowReset(false);
      setNewPassword("");
      Alert.alert("Done", "Password has been reset successfully.");
    },
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to reset password"),
  });

  if (isLoading) return (
    <View style={styles.root}>
      <AdminHeader title="User Detail" backButton onBack={() => router.back()} />
      <LoadingState message="Loading user…" />
    </View>
  );
  if (isError || !data) return (
    <View style={styles.root}>
      <AdminHeader title="User Detail" backButton onBack={() => router.back()} />
      <ErrorState onRetry={refetch} />
    </View>
  );

  const selectedClinic = clinicsData?.rows.find((c) => c.id === clinicId);

  return (
    <View style={styles.root}>
      <AdminHeader
        title="Edit User"
        backButton
        onBack={() => router.back()}
        right={<StatusPill status={data.status} small />}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 60 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{data.email.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={styles.profileEmail} numberOfLines={1}>{data.email}</Text>
            <View style={styles.profileMeta}>
              <StatusPill status={data.role} small />
              <Text style={styles.profileDate}>Since {new Date(data.createdAt).toLocaleDateString("en-GB")}</Text>
            </View>
          </View>
        </Card>

        <SectionHeader label="Profile" style={styles.sectionGap} />
        <Card>
          <View style={styles.fields}>
            <TextField
              label="Email Address"
              value={email}
              onChangeText={(v) => { setEmail(v); setDirty(true); }}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View>
              <Text style={styles.fieldLabel}>ROLE</Text>
              <View style={styles.optionRow}>
                {(["MANAGER", "ADMIN"] as const).map((r) => (
                  <Pressable
                    key={r}
                    style={[styles.option, role === r ? styles.optionActive : styles.optionInactive]}
                    onPress={() => { setRole(r); setDirty(true); }}
                  >
                    <Text style={[styles.optionText, { color: role === r ? T.primary : T.textSec }]}>{r}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {role === "MANAGER" && (
              <View>
                <Text style={styles.fieldLabel}>ASSIGNED CLINIC</Text>
                <Pressable
                  style={styles.clinicSelector}
                  onPress={() => setShowClinicPicker(true)}
                >
                  <Text style={[styles.clinicSelectorText, { color: selectedClinic ? T.text : T.textMuted }]}>
                    {selectedClinic?.name ?? "Select clinic…"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={T.textMuted} />
                </Pressable>
              </View>
            )}

            <View>
              <Text style={styles.fieldLabel}>STATUS</Text>
              <View style={styles.optionRow}>
                {(["ACTIVE", "INACTIVE", "SUSPENDED"] as const).map((s) => (
                  <Pressable
                    key={s}
                    style={[styles.option, status === s ? styles.optionActive : styles.optionInactive]}
                    onPress={() => { setStatus(s); setDirty(true); }}
                  >
                    <Text style={[styles.optionText, { color: status === s ? T.primary : T.textSec }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Card>

        <Pressable
          style={[styles.saveBtn, { opacity: (!dirty || saveMutation.isPending) ? 0.5 : 1 }]}
          onPress={() => saveMutation.mutate()}
          disabled={!dirty || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </Pressable>

        <SectionHeader label="Account Actions" style={styles.sectionGap} />
        <Card noPad>
          <Pressable
            style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => setShowReset(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: T.accent + "12" }]}>
              <Ionicons name="key-outline" size={16} color={T.accent} />
            </View>
            <Text style={styles.actionLabel}>Reset Password</Text>
            <Ionicons name="chevron-forward" size={14} color={T.textMuted} />
          </Pressable>
          {data.status !== "INACTIVE" && (
            <>
              <Divider inset={52} />
              <Pressable
                style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => setShowDeactivate(true)}
              >
                <View style={[styles.actionIcon, { backgroundColor: T.dangerBg }]}>
                  <Ionicons name="ban-outline" size={16} color={T.danger} />
                </View>
                <Text style={[styles.actionLabel, { color: T.danger }]}>Deactivate User</Text>
                <Ionicons name="chevron-forward" size={14} color={T.danger} />
              </Pressable>
            </>
          )}
        </Card>
      </ScrollView>

      <Modal visible={showClinicPicker} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>Select Clinic</Text>
              <Pressable onPress={() => setShowClinicPicker(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={T.textSec} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.sheetContent}>
              {(clinicsData?.rows ?? []).map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.clinicOption, clinicId === c.id ? styles.clinicOptionActive : styles.clinicOptionInactive]}
                  onPress={() => { setClinicId(c.id); setDirty(true); setShowClinicPicker(false); }}
                >
                  <Text style={[styles.clinicOptionText, { color: clinicId === c.id ? T.primary : T.text }]}>{c.name}</Text>
                  {clinicId === c.id && <Ionicons name="checkmark" size={16} color={T.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showReset} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="key-outline" size={24} color={T.accent} />
            </View>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <TextField
              label="New Password"
              placeholder="Min 8 characters"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              style={{ width: "100%" }}
            />
            <View style={styles.modalBtns}>
              <Pressable style={styles.modalCancelBtn} onPress={() => { setShowReset(false); setNewPassword(""); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, { opacity: resetMutation.isPending ? 0.7 : 1 }]}
                onPress={() => {
                  if (!newPassword || newPassword.length < 8) return Alert.alert("Validation", "Minimum 8 characters required");
                  resetMutation.mutate();
                }}
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalConfirmText}>Reset</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeactivate} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={[styles.modalIconWrap, { backgroundColor: T.dangerBg }]}>
              <Ionicons name="ban-outline" size={24} color={T.danger} />
            </View>
            <Text style={styles.modalTitle}>Deactivate User</Text>
            <Text style={styles.modalSub}>This user will no longer be able to log in. You can reactivate them later by editing their status.</Text>
            <View style={styles.modalBtns}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setShowDeactivate(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalDestroyBtn, { opacity: deactivateMutation.isPending ? 0.7 : 1 }]}
                onPress={() => deactivateMutation.mutate()}
                disabled={deactivateMutation.isPending}
              >
                {deactivateMutation.isPending ? <ActivityIndicator color={T.danger} size="small" /> : <Text style={styles.modalDestroyText}>Deactivate</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 4 },
  sectionGap: { marginTop: 20 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: T.primary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
  profileEmail: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: T.text },
  profileMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  profileDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted },
  fields: { gap: 16 },
  fieldLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.5, color: T.textSec, marginBottom: 8 },
  optionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  option: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: T.r10, borderWidth: 1.5 },
  optionActive: { borderColor: T.primary, backgroundColor: T.primary + "10" },
  optionInactive: { borderColor: T.border, backgroundColor: "transparent" },
  optionText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  clinicSelector: { flexDirection: "row", alignItems: "center", backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.border, borderRadius: T.r10, paddingHorizontal: 14, paddingVertical: 12 },
  clinicSelectorText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15 },
  saveBtn: { backgroundColor: T.primary, borderRadius: T.r12, paddingVertical: 15, alignItems: "center", marginTop: 16, shadowColor: T.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  actionRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 10 },
  actionIcon: { width: 32, height: 32, borderRadius: T.r8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  actionLabel: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, color: T.text },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: T.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "60%", paddingBottom: 24 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  sheetHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: T.text },
  sheetContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  clinicOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderRadius: T.r10, borderWidth: 1 },
  clinicOptionActive: { borderColor: T.primary, backgroundColor: T.primary + "08" },
  clinicOptionInactive: { borderColor: T.border, backgroundColor: "transparent" },
  clinicOptionText: { fontFamily: "Inter_400Regular", fontSize: 14, flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  modal: { backgroundColor: T.surface, borderRadius: T.r20, padding: 24, width: "87%", alignItems: "center", gap: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 16 },
  modalIconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: T.accent + "12", alignItems: "center", justifyContent: "center" },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: T.text },
  modalSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textSec, textAlign: "center", lineHeight: 20 },
  modalBtns: { flexDirection: "row", gap: 10, width: "100%" },
  modalCancelBtn: { flex: 1, borderRadius: T.r10, paddingVertical: 13, alignItems: "center", borderWidth: 1.5, borderColor: T.border },
  modalCancelText: { fontFamily: "Inter_500Medium", fontSize: 15, color: T.textSec },
  modalConfirmBtn: { flex: 1, borderRadius: T.r10, paddingVertical: 13, alignItems: "center", backgroundColor: T.primary },
  modalConfirmText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  modalDestroyBtn: { flex: 1, borderRadius: T.r10, paddingVertical: 13, alignItems: "center", backgroundColor: T.dangerBg, borderWidth: 1.5, borderColor: T.dangerBorder },
  modalDestroyText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: T.danger },
});
