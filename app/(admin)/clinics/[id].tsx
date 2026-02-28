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
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingView } from "@/components/LoadingView";
import { ErrorView } from "@/components/ErrorView";
import { getClinic, updateClinic, deactivateClinic, Clinic } from "@/lib/api/adminClinics";

export default function ClinicDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "SUSPENDED">("ACTIVE");
  const [dirty, setDirty] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<Clinic>({
    queryKey: ["/v1/admin/clinics", id],
    queryFn: () => getClinic(id),
  });

  useEffect(() => {
    if (data) {
      setName(data.name);
      setCurrency(data.currency);
      setPrice(data.billingUnitPrice != null ? String(data.billingUnitPrice) : "");
      setStatus(data.status);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => updateClinic(id, {
      name: name.trim(),
      currency: currency.trim() || "EUR",
      billingUnitPrice: price ? parseFloat(price) : null,
      status,
    }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["/v1/admin/clinics"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/metrics"] });
      setDirty(false);
      setName(updated.name);
      setCurrency(updated.currency);
      setPrice(updated.billingUnitPrice != null ? String(updated.billingUnitPrice) : "");
      setStatus(updated.status);
    },
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to save"),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateClinic(id),
    onSuccess: () => {
      setShowDeactivate(false);
      qc.invalidateQueries({ queryKey: ["/v1/admin/clinics"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/metrics"] });
      router.back();
    },
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to deactivate"),
  });

  if (isLoading) return <LoadingView message="Loading clinic..." />;
  if (isError || !data) return <ErrorView onRetry={refetch} />;

  function Field({ label, value, onChange, placeholder, keyboardType }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    keyboardType?: "default" | "decimal-pad";
  }) {
    return (
      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>{label}</Text>
        <TextInput
          style={[styles.fieldInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background, fontFamily: "Inter_400Regular" }]}
          value={value}
          onChangeText={(v) => { onChange(v); setDirty(true); }}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType ?? "default"}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerBar, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
          {data.name}
        </Text>
        <StatusBadge status={status as any} small />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Field label="Clinic Name" value={name} onChange={setName} placeholder="Clinic name" />
          <Field label="Currency (3-letter code)" value={currency} onChange={setCurrency} placeholder="EUR" />
          <Field label="Billing Unit Price (leave empty for default)" value={price} onChange={setPrice} placeholder="e.g. 50" keyboardType="decimal-pad" />

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Status</Text>
            <View style={styles.statusRow}>
              {(["ACTIVE", "INACTIVE", "SUSPENDED"] as const).map((s) => (
                <Pressable
                  key={s}
                  style={[
                    styles.statusOption,
                    { borderColor: status === s ? colors.accent : colors.border, backgroundColor: status === s ? colors.accent + "18" : "transparent" },
                  ]}
                  onPress={() => { setStatus(s); setDirty(true); }}
                >
                  <Text style={[styles.statusOptionText, { color: status === s ? colors.accent : colors.textSecondary, fontFamily: "Inter_500Medium" }]}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <Pressable
          style={[styles.saveBtn, { backgroundColor: dirty ? colors.accent : colors.accent + "60", opacity: saveMutation.isPending ? 0.7 : 1 }]}
          onPress={() => { if (!name.trim()) return Alert.alert("Validation", "Name is required"); saveMutation.mutate(); }}
          disabled={!dirty || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>Save Changes</Text>
          )}
        </Pressable>

        {data.status !== "INACTIVE" && (
          <Pressable
            style={[styles.deactivateBtn, { borderColor: colors.error }]}
            onPress={() => setShowDeactivate(true)}
          >
            <Ionicons name="ban-outline" size={16} color={colors.error} />
            <Text style={[styles.deactivateBtnText, { color: colors.error, fontFamily: "Inter_500Medium" }]}>Deactivate Clinic</Text>
          </Pressable>
        )}

        <Text style={[styles.createdText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
          Created {new Date(data.createdAt).toLocaleDateString()}
        </Text>
      </ScrollView>

      <Modal visible={showDeactivate} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Deactivate Clinic</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              This will set the clinic status to INACTIVE. You can reactivate it later.
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
                {deactivateMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>Deactivate</Text>
                )}
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
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18 },
  content: { padding: 16, gap: 16 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 12, letterSpacing: 0.5 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  statusRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statusOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusOptionText: { fontSize: 12 },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 16 },
  deactivateBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  deactivateBtnText: { fontSize: 15 },
  createdText: { fontSize: 12, textAlign: "center" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  modal: { borderRadius: 16, padding: 24, width: "85%", gap: 12 },
  modalTitle: { fontSize: 18 },
  modalSub: { fontSize: 14, lineHeight: 20 },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1 },
  modalBtnText: { fontSize: 15 },
});
