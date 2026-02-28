import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
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
import { getAdminInvoice, updateInvoiceStatus, AdminInvoice } from "@/lib/api/adminInvoices";

function statusColor(status: string, colors: typeof Colors.light): string {
  if (status === "PAID") return colors.success;
  if (status === "ISSUED") return colors.accent;
  return colors.warning;
}

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<"DRAFT" | "ISSUED" | "PAID" | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<AdminInvoice>({
    queryKey: ["/v1/admin/invoices", id],
    queryFn: () => getAdminInvoice(id),
  });

  const statusMutation = useMutation({
    mutationFn: (status: "DRAFT" | "ISSUED" | "PAID") => updateInvoiceStatus(id, status),
    onSuccess: (updated) => {
      setShowConfirm(false);
      setPendingStatus(null);
      qc.setQueryData(["/v1/admin/invoices", id], updated);
      qc.invalidateQueries({ queryKey: ["/v1/admin/invoices"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/metrics"] });
    },
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to update status"),
  });

  if (isLoading) return <LoadingView message="Loading invoice..." />;
  if (isError || !data) return <ErrorView onRetry={refetch} />;

  const sColor = statusColor(data.status, colors);

  function InfoRow({ label, value }: { label: string; value: string }) {
    return (
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text, fontFamily: "Inter_400Regular" }]}>{value}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerBar, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Invoice</Text>
        <View style={[styles.statusBadge, { backgroundColor: sColor + "20" }]}>
          <Text style={[styles.statusText, { color: sColor, fontFamily: "Inter_600SemiBold" }]}>{data.status}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>INVOICE DETAILS</Text>
          <InfoRow label="Period" value={data.period} />
          <InfoRow label="Patients" value={String(data.patientCount)} />
          <InfoRow label="Unit Price" value={`${data.currency} ${data.unitPrice.toFixed(2)}`} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
              {data.currency} {data.total.toFixed(2)}
            </Text>
          </View>
        </View>

        {data.clinic && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>CLINIC</Text>
            <InfoRow label="Name" value={data.clinic.name} />
            <InfoRow label="Currency" value={data.clinic.currency} />
            <InfoRow
              label="Billing Rate"
              value={data.clinic.billingUnitPrice != null ? `${data.clinic.currency} ${data.clinic.billingUnitPrice}` : "Default"}
            />
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>CHANGE STATUS</Text>
          <View style={styles.statusActions}>
            {(["DRAFT", "ISSUED", "PAID"] as const).map((s) => {
              const c = statusColor(s, colors);
              const isCurrent = data.status === s;
              return (
                <Pressable
                  key={s}
                  style={[styles.statusBtn, { borderColor: isCurrent ? c : colors.border, backgroundColor: isCurrent ? c + "18" : "transparent", opacity: isCurrent ? 0.6 : 1 }]}
                  onPress={() => { if (!isCurrent) { setPendingStatus(s); setShowConfirm(true); } }}
                  disabled={isCurrent}
                >
                  <Text style={[styles.statusBtnText, { color: isCurrent ? c : colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>{s}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={[styles.meta, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
          Created {new Date(data.createdAt).toLocaleDateString()}
        </Text>
      </ScrollView>

      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Update Status</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Change invoice status to{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold" }}>{pendingStatus}</Text>?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => { setShowConfirm(false); setPendingStatus(null); }}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.accent, borderColor: colors.accent, opacity: statusMutation.isPending ? 0.7 : 1 }]}
                onPress={() => { if (pendingStatus) statusMutation.mutate(pendingStatus); }}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[styles.modalBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>Confirm</Text>}
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
  headerTitle: { flex: 1, fontSize: 20 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 12 },
  content: { padding: 16, gap: 14 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 11, letterSpacing: 1 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14 },
  divider: { height: 1, marginVertical: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 16 },
  totalValue: { fontSize: 22 },
  statusActions: { flexDirection: "row", gap: 10 },
  statusBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  statusBtnText: { fontSize: 13 },
  meta: { fontSize: 12, textAlign: "center" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  modal: { borderRadius: 16, padding: 24, width: "85%", gap: 12 },
  modalTitle: { fontSize: 18 },
  modalSub: { fontSize: 14, lineHeight: 20 },
  modalButtons: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1 },
  modalBtnText: { fontSize: 15 },
});
