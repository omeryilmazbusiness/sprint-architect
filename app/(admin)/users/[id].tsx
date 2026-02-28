import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import Colors from "@/constants/colors";
import { LoadingView } from "@/components/LoadingView";
import { ErrorView } from "@/components/ErrorView";
import { getUser, updateUser, deactivateUser, resetUserPassword, AdminUser, UpdateUserInput } from "@/lib/api/adminUsers";
import { listClinics, ClinicListResponse } from "@/lib/api/adminClinics";

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
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
    onSuccess: () => { setShowReset(false); setNewPassword(""); Alert.alert("Done", "Password has been reset"); },
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to reset password"),
  });

  if (isLoading) return <LoadingView message="Loading user..." />;
  if (isError || !data) return <ErrorView onRetry={refetch} />;

  const selectedClinic = clinicsData?.rows.find((c) => c.id === clinicId);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerBar, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
            {data.email}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: (role === "ADMIN" ? colors.warning : colors.accent) + "20" }]}>
            <Text style={[styles.roleBadgeText, { color: role === "ADMIN" ? colors.warning : colors.accent, fontFamily: "Inter_600SemiBold" }]}>{role}</Text>
          </View>
        </View>
        <View style={[styles.statusDot, { backgroundColor: status === "ACTIVE" ? colors.success : colors.statusInactive }]} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Email</Text>
            <TextInput
              style={[styles.fieldInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background, fontFamily: "Inter_400Regular" }]}
              value={email}
              onChangeText={(v) => { setEmail(v); setDirty(true); }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Role</Text>
            <View style={styles.optionRow}>
              {(["MANAGER", "ADMIN"] as const).map((r) => (
                <Pressable
                  key={r}
                  style={[styles.option, { borderColor: role === r ? colors.accent : colors.border, backgroundColor: role === r ? colors.accent + "18" : "transparent" }]}
                  onPress={() => { setRole(r); setDirty(true); }}
                >
                  <Text style={[styles.optionText, { color: role === r ? colors.accent : colors.textSecondary, fontFamily: "Inter_500Medium" }]}>{r}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {role === "MANAGER" && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Assigned Clinic</Text>
              <Pressable
                style={[styles.fieldInput, { borderColor: colors.border, backgroundColor: colors.background, flexDirection: "row", alignItems: "center" }]}
                onPress={() => setShowClinicPicker(true)}
              >
                <Text style={[styles.clinicValue, { color: selectedClinic ? colors.text : colors.textMuted, fontFamily: "Inter_400Regular", flex: 1 }]}>
                  {selectedClinic?.name ?? "Select clinic..."}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Status</Text>
            <View style={styles.optionRow}>
              {(["ACTIVE", "INACTIVE", "SUSPENDED"] as const).map((s) => (
                <Pressable
                  key={s}
                  style={[styles.option, { borderColor: status === s ? colors.accent : colors.border, backgroundColor: status === s ? colors.accent + "18" : "transparent" }]}
                  onPress={() => { setStatus(s); setDirty(true); }}
                >
                  <Text style={[styles.optionText, { color: status === s ? colors.accent : colors.textSecondary, fontFamily: "Inter_500Medium" }]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <Pressable
          style={[styles.saveBtn, { backgroundColor: dirty ? colors.accent : colors.accent + "60", opacity: saveMutation.isPending ? 0.7 : 1 }]}
          onPress={() => saveMutation.mutate()}
          disabled={!dirty || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>Save Changes</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.secondaryBtn, { borderColor: colors.accent }]}
          onPress={() => setShowReset(true)}
        >
          <Ionicons name="key-outline" size={16} color={colors.accent} />
          <Text style={[styles.secondaryBtnText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>Reset Password</Text>
        </Pressable>

        {data.status !== "INACTIVE" && (
          <Pressable
            style={[styles.secondaryBtn, { borderColor: colors.error }]}
            onPress={() => setShowDeactivate(true)}
          >
            <Ionicons name="ban-outline" size={16} color={colors.error} />
            <Text style={[styles.secondaryBtnText, { color: colors.error, fontFamily: "Inter_500Medium" }]}>Deactivate User</Text>
          </Pressable>
        )}

        <Text style={[styles.meta, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
          Created {new Date(data.createdAt).toLocaleDateString()}
        </Text>
      </ScrollView>

      <Modal visible={showClinicPicker} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, maxHeight: "60%" }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Select Clinic</Text>
            <ScrollView>
              {(clinicsData?.rows ?? []).map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.clinicOption, { borderColor: clinicId === c.id ? colors.accent : colors.border, backgroundColor: clinicId === c.id ? colors.accent + "18" : "transparent" }]}
                  onPress={() => { setClinicId(c.id); setDirty(true); setShowClinicPicker(false); }}
                >
                  <Text style={[styles.clinicOptionText, { color: clinicId === c.id ? colors.accent : colors.text, fontFamily: "Inter_400Regular" }]}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={[styles.modalBtn, { borderColor: colors.border, marginTop: 12 }]} onPress={() => setShowClinicPicker(false)}>
              <Text style={[styles.modalBtnText, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showReset} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Reset Password</Text>
            <TextInput
              style={[styles.fieldInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background, fontFamily: "Inter_400Regular" }]}
              placeholder="New password (min 8 chars)"
              placeholderTextColor={colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => { setShowReset(false); setNewPassword(""); }}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.accent, borderColor: colors.accent, opacity: resetMutation.isPending ? 0.7 : 1 }]}
                onPress={() => { if (!newPassword || newPassword.length < 8) return Alert.alert("Validation", "Min 8 characters"); resetMutation.mutate(); }}
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[styles.modalBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>Reset</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeactivate} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Deactivate User</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              This user will no longer be able to log in.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => setShowDeactivate(false)}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.error, borderColor: colors.error, opacity: deactivateMutation.isPending ? 0.7 : 1 }]}
                onPress={() => deactivateMutation.mutate()}
                disabled={deactivateMutation.isPending}
              >
                {deactivateMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[styles.modalBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>Deactivate</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1, gap: 3 },
  headerTitle: { fontSize: 15 },
  roleBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  roleBadgeText: { fontSize: 10, letterSpacing: 0.5 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  content: { padding: 16, gap: 14 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 16 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 12, letterSpacing: 0.5 },
  fieldInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  clinicValue: { fontSize: 15 },
  optionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  option: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  optionText: { fontSize: 12 },
  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16 },
  secondaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, flexDirection: "row", justifyContent: "center", gap: 8 },
  secondaryBtnText: { fontSize: 15 },
  meta: { fontSize: 12, textAlign: "center" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
  modalTitle: { fontSize: 18 },
  modalSub: { fontSize: 14, lineHeight: 20 },
  modalButtons: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1 },
  modalBtnText: { fontSize: 15 },
  clinicOption: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  clinicOptionText: { fontSize: 14 },
});
