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
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import Colors from "@/constants/colors";
import { LoadingView } from "@/components/LoadingView";
import { ErrorView } from "@/components/ErrorView";
import { getAdminInvoice, markInvoicePaid, AdminInvoice } from "@/lib/api/adminInvoices";

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function statusColor(status: string, colors: typeof Colors.light): string {
  if (status === "PAID") return colors.success;
  if (status === "UNPAID") return colors.error;
  return colors.warning;
}

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [showConfirm, setShowConfirm] = useState(false);

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
      Alert.alert("Error", err.message || "Failed to mark invoice as paid");
    },
  });

  if (isLoading) return <LoadingView message="Loading invoice..." />;
  if (isError || !data) return <ErrorView onRetry={refetch} />;

  const sc = statusColor(data.status, colors);
  const canMarkPaid = data.status !== "PAID";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={colors.gradient} style={[styles.hero, { paddingTop: topPad + 12 }]}>
        <View style={styles.heroRow}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={styles.heroCenter}>
            <Text style={[styles.heroTitle, { fontFamily: "Inter_700Bold" }]}>
              Invoice · {data.period}
            </Text>
            <Text style={[styles.heroClinic, { fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
              {data.clinic?.name ?? "Unknown Clinic"}
            </Text>
          </View>
        </View>
        <View style={styles.heroBadgeRow}>
          <View style={[styles.statusBadge, { backgroundColor: sc + "22", borderWidth: 1, borderColor: sc + "50" }]}>
            <Text style={[styles.statusBadgeText, { color: sc, fontFamily: "Inter_700Bold" }]}>
              {data.status}
            </Text>
          </View>
          <Text style={[styles.totalHero, { fontFamily: "Inter_700Bold" }]}>
            {data.currency} {data.total.toFixed(2)}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {data.status === "UNPAID" && (
          <View style={[styles.alertBanner, { backgroundColor: colors.error + "10", borderColor: colors.error + "30" }]}>
            <Ionicons name="warning-outline" size={18} color={colors.error} />
            <Text style={[styles.alertText, { color: colors.error, fontFamily: "Inter_500Medium" }]}>
              UNPAID — the clinic is suspended. Managers and patients cannot access the system until this invoice is marked as PAID.
            </Text>
          </View>
        )}
        {data.status === "PENDING" && data.dueAt && (
          <View style={[styles.alertBanner, { backgroundColor: colors.warning + "10", borderColor: colors.warning + "30" }]}>
            <Ionicons name="time-outline" size={18} color={colors.warning} />
            <Text style={[styles.alertText, { color: colors.warning, fontFamily: "Inter_500Medium" }]}>
              PENDING — due {fmt(data.dueAt)}. At midnight the clinic will be suspended if not paid.
            </Text>
          </View>
        )}

        <SLabel colors={colors} text="BILLING DETAILS" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <IRow label="Clinic" value={data.clinic?.name ?? "—"} icon="business-outline" colors={colors} />
          <Sep colors={colors} />
          <IRow label="Period" value={data.period} icon="calendar-outline" colors={colors} />
          <Sep colors={colors} />
          <IRow label="Patients" value={String(data.patientCount)} icon="people-outline" colors={colors} />
          <Sep colors={colors} />
          <IRow label="Unit Price" value={`${data.currency} ${data.unitPrice.toFixed(2)}`} icon="pricetag-outline" colors={colors} />
          <Sep colors={colors} />
          <IRow label="Total" value={`${data.currency} ${data.total.toFixed(2)}`} icon="cash-outline" colors={colors} bold />
        </View>

        <SLabel colors={colors} text="TIMELINE" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <IRow label="Created" value={fmt(data.createdAt)} icon="add-circle-outline" colors={colors} />
          <Sep colors={colors} />
          <IRow label="Due By" value={fmt(data.dueAt)} icon="alert-outline" colors={colors} />
          {data.paidAt && (
            <>
              <Sep colors={colors} />
              <IRow label="Paid At" value={fmt(data.paidAt)} icon="checkmark-circle-outline" colors={colors} valueColor={colors.success} />
            </>
          )}
        </View>

        {data.status === "PAID" && (
          <View style={[styles.paidBanner, { backgroundColor: colors.success + "10", borderColor: colors.success + "30" }]}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.paidTitle, { color: colors.success, fontFamily: "Inter_700Bold" }]}>
                Invoice Paid
              </Text>
              <Text style={[styles.paidSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                Clinic and all users have been reactivated
              </Text>
            </View>
          </View>
        )}

        {canMarkPaid && (
          <Pressable
            style={({ pressed }) => [styles.payBtn, { backgroundColor: colors.success, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => setShowConfirm(true)}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={[styles.payBtnText, { fontFamily: "Inter_700Bold" }]}>Mark as PAID</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.confirmModal, { backgroundColor: colors.card }]}>
            <View style={[styles.confirmIconWrap, { backgroundColor: colors.success + "15" }]}>
              <Ionicons name="checkmark-circle-outline" size={32} color={colors.success} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
              Confirm Payment
            </Text>
            <Text style={[styles.confirmSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Marking this invoice as PAID will immediately:
            </Text>
            <View style={styles.impactList}>
              <Impact icon="business-outline" text="Reactivate the clinic" color={colors.success} colors={colors} />
              <Impact icon="people-outline" text="Restore all managers' access" color={colors.success} colors={colors} />
              <Impact icon="person-outline" text="Restore all patients' access" color={colors.success} colors={colors} />
              <Impact icon="document-text-outline" text={`${data.period} · ${data.currency} ${data.total.toFixed(2)}`} color={colors.accent} colors={colors} />
            </View>
            <View style={styles.confirmBtns}>
              <Pressable
                style={[styles.confirmBtn, { borderColor: colors.border }]}
                onPress={() => setShowConfirm(false)}
                disabled={paidMutation.isPending}
              >
                <Text style={[styles.confirmBtnTxt, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, { backgroundColor: colors.success, borderColor: colors.success, opacity: paidMutation.isPending ? 0.7 : 1 }]}
                onPress={() => paidMutation.mutate()}
                disabled={paidMutation.isPending}
              >
                {paidMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.confirmBtnTxt, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                    Confirm PAID
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SLabel({ text, colors }: { text: string; colors: typeof Colors.light }) {
  return (
    <Text style={[styles.sLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
      {text}
    </Text>
  );
}

function Sep({ colors }: { colors: typeof Colors.light }) {
  return <View style={[styles.sep, { backgroundColor: colors.border }]} />;
}

function IRow({
  icon, label, value, colors, bold, valueColor,
}: {
  icon: string;
  label: string;
  value: string;
  colors: typeof Colors.light;
  bold?: boolean;
  valueColor?: string;
}) {
  return (
    <View style={styles.iRow}>
      <Ionicons name={icon as any} size={15} color={colors.accent} />
      <Text style={[styles.iLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{label}</Text>
      <Text style={[styles.iValue, { color: valueColor ?? colors.text, fontFamily: bold ? "Inter_700Bold" : "Inter_500Medium" }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Impact({ icon, text, color, colors }: { icon: string; text: string; color: string; colors: typeof Colors.light }) {
  return (
    <View style={styles.impactRow}>
      <View style={[styles.impactIcon, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon as any} size={13} color={color} />
      </View>
      <Text style={[styles.impactText, { color: colors.text, fontFamily: "Inter_400Regular" }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { paddingHorizontal: 16, paddingBottom: 20 },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginTop: 2 },
  heroCenter: { flex: 1, gap: 4 },
  heroTitle: { fontSize: 20, color: "#fff" },
  heroClinic: { fontSize: 13, color: "rgba(255,255,255,0.7)" },
  heroBadgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusBadgeText: { fontSize: 13 },
  totalHero: { fontSize: 26, color: "#fff" },
  content: { padding: 16, gap: 6 },
  alertBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8 },
  alertText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  iRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 13 },
  iLabel: { flex: 1, fontSize: 14 },
  iValue: { fontSize: 14, maxWidth: "55%" },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  paidBanner: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 16, marginTop: 14 },
  paidTitle: { fontSize: 15 },
  paidSub: { fontSize: 12, marginTop: 2 },
  payBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 16, marginTop: 20 },
  payBtnText: { color: "#fff", fontSize: 16 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  confirmModal: { borderRadius: 20, padding: 24, width: "88%", gap: 14, alignItems: "center" },
  confirmIconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  confirmTitle: { fontSize: 20 },
  confirmSub: { fontSize: 14, alignSelf: "flex-start" },
  impactList: { width: "100%", gap: 10 },
  impactRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  impactIcon: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  impactText: { flex: 1, fontSize: 13 },
  confirmBtns: { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  confirmBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center", borderWidth: 1 },
  confirmBtnTxt: { fontSize: 15 },
});
