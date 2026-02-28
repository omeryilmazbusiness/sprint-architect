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
import { getClinicDetail, updateClinic, deactivateClinic, ClinicDetail, InvoiceSummary } from "@/lib/api/adminClinics";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(inv: InvoiceSummary): boolean {
  return inv.status !== "PAID" && !!inv.dueAt && new Date(inv.dueAt) < new Date();
}

function invoiceStatusColor(inv: InvoiceSummary, colors: typeof Colors.light): string {
  if (isOverdue(inv)) return colors.error;
  if (inv.status === "PAID") return colors.success;
  if (inv.status === "ISSUED") return colors.warning;
  return colors.textMuted;
}

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
  const [anchorDay, setAnchorDay] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "SUSPENDED">("ACTIVE");
  const [dirty, setDirty] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<ClinicDetail>({
    queryKey: ["/v1/admin/clinics", id, "detail"],
    queryFn: () => getClinicDetail(id),
  });

  useEffect(() => {
    if (data) {
      setName(data.name);
      setCurrency(data.currency);
      setPrice(data.billingUnitPrice != null ? String(data.billingUnitPrice) : "");
      setAnchorDay(String(data.billingAnchorDay));
      setStatus(data.status);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => updateClinic(id, {
      name: name.trim(),
      currency: currency.trim() || "EUR",
      billingUnitPrice: price ? parseFloat(price) : null,
      billingAnchorDay: anchorDay ? parseInt(anchorDay) : undefined,
      status,
    }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["/v1/admin/clinics"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/metrics"] });
      setDirty(false);
      setName(updated.name);
      setCurrency(updated.currency);
      setPrice(updated.billingUnitPrice != null ? String(updated.billingUnitPrice) : "");
      setAnchorDay(String(updated.billingAnchorDay));
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
    keyboardType?: "default" | "decimal-pad" | "number-pad";
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
          <Text style={[styles.cardLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>BILLING INFO</Text>
          <View style={styles.billingRow}>
            <BillingItem icon="calendar-outline" label="Anchor Day" value={`Day ${data.billingAnchorDay}`} colors={colors} />
            <BillingItem icon="arrow-forward-circle-outline" label="Next Invoice" value={formatDate(data.nextInvoiceDate)} colors={colors} />
          </View>
          {data.currentPeriodInvoice && (
            <View style={[styles.currentInvoiceBadge, {
              backgroundColor: invoiceStatusColor(data.currentPeriodInvoice, colors) + "18",
              borderColor: invoiceStatusColor(data.currentPeriodInvoice, colors) + "40",
            }]}>
              <Ionicons name="document-text-outline" size={14} color={invoiceStatusColor(data.currentPeriodInvoice, colors)} />
              <Text style={[styles.currentInvoiceText, { color: invoiceStatusColor(data.currentPeriodInvoice, colors), fontFamily: "Inter_500Medium" }]}>
                {data.currentPeriodInvoice.period} · {data.currentPeriodInvoice.status}
                {" · "}
                {data.currentPeriodInvoice.currency} {data.currentPeriodInvoice.total.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>SETTINGS</Text>
          <Field label="Clinic Name" value={name} onChange={setName} placeholder="Clinic name" />
          <Field label="Currency (3-letter code)" value={currency} onChange={setCurrency} placeholder="EUR" />
          <Field label="Billing Unit Price (leave empty for default)" value={price} onChange={setPrice} placeholder="e.g. 50" keyboardType="decimal-pad" />
          <Field label="Billing Anchor Day (1–28)" value={anchorDay} onChange={setAnchorDay} placeholder="e.g. 15" keyboardType="number-pad" />

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

        <Pressable
          style={[styles.actionBtn, { borderColor: colors.accent }]}
          onPress={() => router.push({ pathname: "/(admin)/users", params: { preselectedClinicId: id } })}
        >
          <Ionicons name="person-add-outline" size={16} color={colors.accent} />
          <Text style={[styles.actionBtnText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>Create Manager for this Clinic</Text>
        </Pressable>

        {data.status !== "INACTIVE" && (
          <Pressable
            style={[styles.actionBtn, { borderColor: colors.error }]}
            onPress={() => setShowDeactivate(true)}
          >
            <Ionicons name="ban-outline" size={16} color={colors.error} />
            <Text style={[styles.actionBtnText, { color: colors.error, fontFamily: "Inter_500Medium" }]}>Deactivate Clinic</Text>
          </Pressable>
        )}

        {data.managers.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>MANAGERS</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 0 }]}>
              {data.managers.map((mgr, i) => (
                <View key={mgr.id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <View style={styles.managerRow}>
                    <View style={[styles.avatar, { backgroundColor: colors.accent + "20" }]}>
                      <Text style={[styles.avatarText, { color: colors.accent, fontFamily: "Inter_700Bold" }]}>
                        {mgr.email.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.managerEmail, { color: colors.text, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                      {mgr.email}
                    </Text>
                    <View style={[styles.statusDot, { backgroundColor: mgr.status === "ACTIVE" ? colors.success : colors.statusInactive }]} />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {data.invoiceTimeline.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>INVOICE HISTORY</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 0 }]}>
              {data.invoiceTimeline.map((inv, i) => {
                const overdue = isOverdue(inv);
                const statusColor = invoiceStatusColor(inv, colors);
                const displayStatus = overdue ? "OVERDUE" : inv.status;
                return (
                  <View key={inv.id}>
                    {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                    <Pressable
                      style={({ pressed }) => [styles.invoiceRow, { opacity: pressed ? 0.7 : 1 }]}
                      onPress={() => router.push({ pathname: "/(admin)/invoices/[id]", params: { id: inv.id } })}
                    >
                      <View style={styles.invoiceLeft}>
                        <Text style={[styles.invPeriod, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                          {inv.period}
                        </Text>
                        <Text style={[styles.invMeta, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
                          {inv.patientCount} patients · {inv.currency} {inv.total.toFixed(2)}
                        </Text>
                        {inv.dueAt && (
                          <Text style={[styles.invMeta, { color: overdue ? colors.error : colors.textMuted, fontFamily: "Inter_400Regular" }]}>
                            Due {formatDate(inv.dueAt)}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.invBadge, { backgroundColor: statusColor + "20" }]}>
                        <Text style={[styles.invBadgeText, { color: statusColor, fontFamily: "Inter_600SemiBold" }]}>
                          {displayStatus}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
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

function BillingItem({ icon, label, value, colors }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.billingItem}>
      <Ionicons name={icon} size={16} color={colors.accent} />
      <View>
        <Text style={[styles.billingLabel, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>{label}</Text>
        <Text style={[styles.billingValue, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>{value}</Text>
      </View>
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
  content: { padding: 16, gap: 14 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 14 },
  cardLabel: { fontSize: 11, letterSpacing: 0.8, marginBottom: -4 },
  billingRow: { flexDirection: "row", gap: 20 },
  billingItem: { flexDirection: "row", gap: 8, alignItems: "center" },
  billingLabel: { fontSize: 11 },
  billingValue: { fontSize: 14 },
  currentInvoiceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  currentInvoiceText: { fontSize: 13, flex: 1 },
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
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnText: { fontSize: 15 },
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 4 },
  divider: { height: 1 },
  managerRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14 },
  managerEmail: { flex: 1, fontSize: 14 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  invoiceRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  invoiceLeft: { flex: 1, gap: 2 },
  invPeriod: { fontSize: 15 },
  invMeta: { fontSize: 12 },
  invBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  invBadgeText: { fontSize: 11 },
  createdText: { fontSize: 12, textAlign: "center", marginTop: 4 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  modal: { borderRadius: 16, padding: 24, width: "85%", gap: 12 },
  modalTitle: { fontSize: 18 },
  modalSub: { fontSize: 14, lineHeight: 20 },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1 },
  modalBtnText: { fontSize: 15 },
});
