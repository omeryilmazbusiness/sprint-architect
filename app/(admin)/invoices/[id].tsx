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
  Modal,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  Card, SectionHeader, StatusPill, Divider, LoadingState, ErrorState,
} from "@/components/ui";
import { getAdminInvoice, markInvoicePaid, AdminInvoice } from "@/lib/api/adminInvoices";
import { useT } from "@/hooks/useT";

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function statusAccent(status: string): string {
  if (status === "PAID") return T.success;
  if (status === "UNPAID") return T.danger;
  return T.warning;
}

export default function InvoiceDetailScreen() {
  const t = useT();
  const ti = t.adminInvoices;
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data, isLoading, isError, refetch } = useQuery<AdminInvoice>({
    queryKey: ["/v1/admin/invoices", id],
    queryFn: () => getAdminInvoice(id),
  });

  const paidMutation = useMutation({
    mutationFn: () => markInvoicePaid(id),
    onSuccess: (updated) => {
      setShowConfirm(false);
      qc.setQueryData(["/v1/admin/invoices", id], updated);
      qc.invalidateQueries({ queryKey: ["/v1/admin/invoices"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/metrics"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/clinics"] });
    },
    onError: (err: any) => {
      setShowConfirm(false);
      Alert.alert("Error", err.message || ti.errorMarkPaid);
    },
  });

  if (isLoading) return (
    <View style={styles.root}>
      <AdminHeader title={ti.invoiceLabel} backButton onBack={() => router.back()} />
      <LoadingState message={ti.loadingInvoice} />
    </View>
  );
  if (isError || !data) return (
    <View style={styles.root}>
      <AdminHeader title={ti.invoiceLabel} backButton onBack={() => router.back()} />
      <ErrorState onRetry={refetch} />
    </View>
  );

  const sc = statusAccent(data.status);
  const canMarkPaid = data.status !== "PAID";

  return (
    <View style={styles.root}>
      <AdminHeader
        title={`${ti.invoiceLabel} · ${data.period}`}
        backButton
        onBack={() => router.back()}
        right={<StatusPill status={data.status} />}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={[styles.summaryCard, { borderLeftWidth: 4, borderLeftColor: sc }]}>
          <View style={styles.summaryRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.clinicName}>{data.clinic?.name ?? ti.unknownClinic}</Text>
              <Text style={styles.period}>{data.period}</Text>
            </View>
            <View style={styles.totalBlock}>
              <Text style={[styles.totalAmount, { color: sc }]}>{data.currency} {data.total.toFixed(2)}</Text>
              <Text style={styles.totalLabel}>{ti.totalDue}</Text>
            </View>
          </View>
        </Card>

        {data.status === "UNPAID" && (
          <View style={styles.alertBanner}>
            <View style={[styles.alertIcon, { backgroundColor: T.dangerBg }]}>
              <Ionicons name="warning-outline" size={18} color={T.danger} />
            </View>
            <Text style={[styles.alertText, { color: T.danger }]}>
              {ti.unpaidAlert}
            </Text>
          </View>
        )}
        {data.status === "PENDING" && data.dueAt && (
          <View style={[styles.alertBanner, styles.alertBannerWarning]}>
            <View style={[styles.alertIcon, { backgroundColor: T.warningBg }]}>
              <Ionicons name="time-outline" size={18} color={T.warning} />
            </View>
            <Text style={[styles.alertText, { color: T.warning }]}>
              {ti.pendingAlert.replace("{date}", fmt(data.dueAt))}
            </Text>
          </View>
        )}
        {data.status === "PAID" && (
          <View style={[styles.alertBanner, styles.alertBannerSuccess]}>
            <View style={[styles.alertIcon, { backgroundColor: T.successBg }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color={T.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertText, { color: T.success }]}>{ti.paidAlert}</Text>
            </View>
          </View>
        )}

        <SectionHeader label={ti.billingDetailsSection} style={styles.sectionGap} />
        <Card noPad>
          <IRow icon="business-outline" label={ti.clinicLabel} value={data.clinic?.name ?? "—"} />
          <Divider />
          <IRow icon="calendar-outline" label={ti.periodPlaceholder ?? "Period"} value={data.period} />
          <Divider />
          <IRow icon="people-outline" label={ti.patientsLabel} value={String(data.patientCount)} />
          <Divider />
          <IRow icon="pricetag-outline" label={ti.unitPriceLabel} value={`${data.currency} ${data.unitPrice.toFixed(2)}`} />
          <Divider />
          <IRow icon="cash-outline" label={ti.totalLabel} value={`${data.currency} ${data.total.toFixed(2)}`} bold />
        </Card>

        <SectionHeader label={ti.timelineSection} style={styles.sectionGap} />
        <Card noPad>
          <IRow icon="add-circle-outline" label={ti.createdLabel} value={fmt(data.createdAt)} />
          <Divider />
          <IRow icon="alert-outline" label={ti.dueByLabel} value={fmt(data.dueAt)} />
          {data.paidAt && (
            <>
              <Divider />
              <IRow icon="checkmark-circle-outline" label={ti.paidAtLabel} value={fmt(data.paidAt)} valueColor={T.success} />
            </>
          )}
        </Card>

        {canMarkPaid && (
          <Pressable
            style={({ pressed }) => [styles.payBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => setShowConfirm(true)}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.payBtnText}>{ti.markAsPaid}</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="checkmark-circle-outline" size={32} color={T.success} />
            </View>
            <Text style={styles.confirmTitle}>{ti.confirmPaymentTitle}</Text>
            <Text style={styles.confirmSub}>{ti.confirmPaymentSub}</Text>
            <View style={styles.impactList}>
              <Impact icon="business-outline" label={ti.impactReactivateClinic} color={T.success} />
              <Impact icon="people-outline" label={ti.impactRestoreManagers} color={T.success} />
              <Impact icon="person-outline" label={ti.impactRestorePatients} color={T.success} />
              <Impact icon="document-text-outline" label={`${data.period} · ${data.currency} ${data.total.toFixed(2)}`} color={T.accent} />
            </View>
            <View style={styles.confirmBtns}>
              <Pressable
                style={styles.confirmCancelBtn}
                onPress={() => setShowConfirm(false)}
                disabled={paidMutation.isPending}
              >
                <Text style={styles.confirmCancelText}>{ti.cancel}</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmOkBtn, { opacity: paidMutation.isPending ? 0.7 : 1 }]}
                onPress={() => paidMutation.mutate()}
                disabled={paidMutation.isPending}
              >
                {paidMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmOkText}>{ti.confirmPaid}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function IRow({ icon, label, value, bold, valueColor }: {
  icon: string; label: string; value: string; bold?: boolean; valueColor?: string;
}) {
  return (
    <View style={styles.iRow}>
      <View style={styles.iIcon}>
        <Ionicons name={icon as any} size={15} color={T.accent} />
      </View>
      <Text style={styles.iLabel}>{label}</Text>
      <Text style={[styles.iValue, bold ? styles.iValueBold : null, valueColor ? { color: valueColor } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Impact({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={styles.impactRow}>
      <View style={[styles.impactIcon, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon as any} size={13} color={color} />
      </View>
      <Text style={styles.impactText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 4 },
  sectionGap: { marginTop: 20 },
  summaryCard: { gap: 0 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  clinicName: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 17, color: T.text },
  period: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 13, color: T.textSec, marginTop: 2 },
  totalBlock: { alignItems: "flex-end" },
  totalAmount: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 22 },
  totalLabel: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 11, color: T.textMuted, marginTop: 2 },
  alertBanner: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: T.dangerBg, borderWidth: 1, borderColor: T.dangerBorder, borderRadius: T.r12, padding: 14, marginTop: 12 },
  alertBannerWarning: { backgroundColor: T.warningBg, borderColor: T.warningBorder },
  alertBannerSuccess: { backgroundColor: T.successBg, borderColor: T.successBorder },
  alertIcon: { width: 32, height: 32, borderRadius: T.r8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  alertText: { flex: 1, fontFamily: "PlusJakartaSans_500Medium", fontSize: 13, lineHeight: 18 },
  iRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 13 },
  iIcon: { width: 28, height: 28, borderRadius: T.r6, backgroundColor: T.accent + "10", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  iLabel: { flex: 1, fontFamily: "PlusJakartaSans_400Regular", fontSize: 14, color: T.textSec },
  iValue: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 14, color: T.text, maxWidth: "55%" },
  iValueBold: { fontFamily: "PlusJakartaSans_700Bold" },
  payBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, backgroundColor: T.success, borderRadius: T.r14,
    paddingVertical: 16, marginTop: 28,
    shadowColor: T.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  payBtnText: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 16, color: "#fff" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  confirmModal: {
    backgroundColor: T.surface, borderRadius: T.r20, padding: 24, width: "88%",
    gap: 14, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 16,
  },
  confirmIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: T.successBg, alignItems: "center", justifyContent: "center" },
  confirmTitle: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 20, color: T.text },
  confirmSub: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 14, color: T.textSec, alignSelf: "flex-start" },
  impactList: { width: "100%", gap: 10 },
  impactRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  impactIcon: { width: 26, height: 26, borderRadius: T.r8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  impactText: { flex: 1, fontFamily: "PlusJakartaSans_400Regular", fontSize: 13, color: T.text },
  confirmBtns: { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  confirmCancelBtn: { flex: 1, borderRadius: T.r10, paddingVertical: 13, alignItems: "center", borderWidth: 1.5, borderColor: T.border },
  confirmCancelText: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 15, color: T.textSec },
  confirmOkBtn: { flex: 1, borderRadius: T.r10, paddingVertical: 13, alignItems: "center", backgroundColor: T.success },
  confirmOkText: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 15, color: "#fff" },
});
