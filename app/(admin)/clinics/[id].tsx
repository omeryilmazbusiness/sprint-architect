import React, { useState } from "react";
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
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import Colors from "@/constants/colors";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingView } from "@/components/LoadingView";
import { ErrorView } from "@/components/ErrorView";
import {
  getClinicDetail,
  updateClinic,
  deactivateClinic,
  ClinicDetail,
  InvoiceSummary,
} from "@/lib/api/adminClinics";

const ALL_SERVICES = ["Rinoplasti", "Göz", "Diş"] as const;

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(inv: InvoiceSummary) {
  return inv.status !== "PAID" && !!inv.dueAt && new Date(inv.dueAt) < new Date();
}

function invStatusColor(inv: InvoiceSummary, colors: typeof Colors.light) {
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
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [showEdit, setShowEdit] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);

  const [editName, setEditName] = useState("");
  const [editCurrency, setEditCurrency] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editAnchorDay, setEditAnchorDay] = useState("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "INACTIVE" | "SUSPENDED">("ACTIVE");
  const [editServices, setEditServices] = useState<string[]>([]);

  const { data, isLoading, isError, refetch } = useQuery<ClinicDetail>({
    queryKey: ["/v1/admin/clinics", id, "detail"],
    queryFn: () => getClinicDetail(id),
  });

  function openEdit() {
    if (!data) return;
    setEditName(data.name);
    setEditCurrency(data.currency);
    setEditPrice(data.billingUnitPrice != null ? String(data.billingUnitPrice) : "");
    setEditAnchorDay(String(data.billingAnchorDay));
    setEditStatus(data.status);
    setEditServices(data.services ?? []);
    setShowEdit(true);
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      updateClinic(id, {
        name: editName.trim(),
        currency: editCurrency.trim() || "EUR",
        billingUnitPrice: editPrice ? parseFloat(editPrice) : null,
        billingAnchorDay: editAnchorDay ? parseInt(editAnchorDay) : undefined,
        status: editStatus,
        services: editServices,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/admin/clinics"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/metrics"] });
      setShowEdit(false);
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

  function toggleEditService(svc: string) {
    setEditServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
    );
  }

  if (isLoading) return <LoadingView message="Loading clinic..." />;
  if (isError || !data) return <ErrorView onRetry={refetch} />;

  const currentInv = data.currentPeriodInvoice;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={colors.gradient} style={[styles.heroHeader, { paddingTop: topPad + 12 }]}>
        <View style={styles.heroRow}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={styles.heroCenter}>
            <Text style={[styles.heroName, { fontFamily: "Inter_700Bold" }]} numberOfLines={2}>
              {data.name}
            </Text>
            <View style={styles.heroMeta}>
              <StatusBadge status={data.status} small />
              <Text style={[styles.heroCreated, { fontFamily: "Inter_400Regular" }]}>
                Since {fmt(data.createdAt)}
              </Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={openEdit}
            hitSlop={10}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {(data.services?.length > 0) && (
          <SectionCard colors={colors} label="SERVICES">
            <View style={styles.chipsRow}>
              {data.services.map((svc) => (
                <View key={svc} style={[styles.serviceChip, { backgroundColor: colors.accent + "18", borderColor: colors.accent + "40" }]}>
                  <Ionicons name="medical-outline" size={12} color={colors.accent} />
                  <Text style={[styles.serviceChipText, { color: colors.accent, fontFamily: "Inter_600SemiBold" }]}>
                    {svc}
                  </Text>
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {(data.address || data.contactPhone || data.contactEmail) && (
          <SectionCard colors={colors} label="CONTACT & ADDRESS">
            {data.address ? (
              <InfoRow icon="location-outline" colors={colors}>
                <Text style={[styles.infoText, { color: colors.text, fontFamily: "Inter_400Regular" }]}>
                  {data.address}
                </Text>
              </InfoRow>
            ) : null}
            {data.contactPhone ? (
              <Pressable onPress={() => Linking.openURL(`tel:${data.contactPhone}`)}>
                <InfoRow icon="call-outline" colors={colors} tappable>
                  <Text style={[styles.infoText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>
                    {data.contactPhone}
                  </Text>
                </InfoRow>
              </Pressable>
            ) : null}
            {data.contactEmail ? (
              <Pressable onPress={() => Linking.openURL(`mailto:${data.contactEmail}`)}>
                <InfoRow icon="mail-outline" colors={colors} tappable>
                  <Text style={[styles.infoText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>
                    {data.contactEmail}
                  </Text>
                </InfoRow>
              </Pressable>
            ) : null}
          </SectionCard>
        )}

        <SectionCard colors={colors} label="BILLING SUMMARY">
          <View style={styles.kpiRow}>
            <KpiTile icon="calendar-outline" label="Billing Day" value={`Day ${data.billingAnchorDay}`} colors={colors} />
            <KpiTile icon="arrow-forward-circle-outline" label="Next Invoice" value={fmt(data.nextInvoiceDate)} colors={colors} />
            {currentInv ? (
              <KpiTile
                icon="document-text-outline"
                label="This Period"
                value={currentInv.status}
                valueColor={invStatusColor(currentInv, colors)}
                colors={colors}
              />
            ) : (
              <KpiTile icon="document-outline" label="This Period" value="No invoice" colors={colors} />
            )}
          </View>
          {currentInv && (
            <View style={[styles.invBanner, { backgroundColor: invStatusColor(currentInv, colors) + "12", borderColor: invStatusColor(currentInv, colors) + "30" }]}>
              <Ionicons name="receipt-outline" size={14} color={invStatusColor(currentInv, colors)} />
              <Text style={[styles.invBannerText, { color: invStatusColor(currentInv, colors), fontFamily: "Inter_500Medium" }]}>
                {currentInv.period} · {currentInv.patientCount} patients · {currentInv.currency}{" "}
                {currentInv.total.toFixed(2)}
              </Text>
            </View>
          )}
        </SectionCard>

        {data.managers.length > 0 && (
          <SectionCard colors={colors} label="MANAGERS">
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
          </SectionCard>
        )}

        {data.invoiceTimeline.length > 0 && (
          <SectionCard colors={colors} label="INVOICE HISTORY" noPad>
            {data.invoiceTimeline.map((inv, i) => {
              const overdue = isOverdue(inv);
              const sc = invStatusColor(inv, colors);
              return (
                <View key={inv.id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <Pressable
                    style={({ pressed }) => [styles.invRow, { opacity: pressed ? 0.7 : 1 }]}
                    onPress={() =>
                      router.push({ pathname: "/(admin)/invoices/[id]", params: { id: inv.id } })
                    }
                  >
                    <View style={styles.invLeft}>
                      <Text style={[styles.invPeriod, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                        {inv.period}
                      </Text>
                      <Text style={[styles.invMeta, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
                        {inv.patientCount} patients · {inv.currency} {inv.total.toFixed(2)}
                      </Text>
                    </View>
                    <View style={[styles.invChip, { backgroundColor: sc + "18" }]}>
                      <Text style={[styles.invChipText, { color: sc, fontFamily: "Inter_600SemiBold" }]}>
                        {overdue ? "OVERDUE" : inv.status}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </Pressable>
                </View>
              );
            })}
          </SectionCard>
        )}

        <View style={styles.actionsCol}>
          <Pressable
            style={({ pressed }) => [styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push({ pathname: "/(admin)/users", params: { preselectedClinicId: id } })}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.accent + "18" }]}>
              <Ionicons name="person-add-outline" size={18} color={colors.accent} />
            </View>
            <Text style={[styles.actionText, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
              Create Manager
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push({ pathname: "/(admin)/invoices" })}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.warning + "18" }]}>
              <Ionicons name="document-text-outline" size={18} color={colors.warning} />
            </View>
            <Text style={[styles.actionText, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
              View Invoices
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          {data.status !== "INACTIVE" && (
            <Pressable
              style={({ pressed }) => [styles.actionRow, { backgroundColor: colors.card, borderColor: colors.error + "40", opacity: pressed ? 0.7 : 1 }]}
              onPress={() => setShowDeactivate(true)}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.error + "12" }]}>
                <Ionicons name="ban-outline" size={18} color={colors.error} />
              </View>
              <Text style={[styles.actionText, { color: colors.error, fontFamily: "Inter_500Medium" }]}>
                Deactivate Clinic
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.error} />
            </Pressable>
          )}
        </View>
      </ScrollView>

      <Modal visible={showEdit} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.editSheet, { backgroundColor: colors.card }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
                Edit Clinic
              </Text>
              <Pressable onPress={() => setShowEdit(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <EditField label="Clinic Name" value={editName} onChange={setEditName} colors={colors} />
              <EditField label="Currency" value={editCurrency} onChange={setEditCurrency} colors={colors} maxLength={3} autoCapitalize="characters" />
              <EditField label="Unit Price (optional)" value={editPrice} onChange={setEditPrice} keyboardType="decimal-pad" colors={colors} />
              <EditField label="Billing Anchor Day (1–28)" value={editAnchorDay} onChange={setEditAnchorDay} keyboardType="number-pad" colors={colors} />

              <Text style={[styles.editFieldLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>STATUS</Text>
              <View style={styles.statusRow}>
                {(["ACTIVE", "INACTIVE", "SUSPENDED"] as const).map((s) => (
                  <Pressable
                    key={s}
                    style={[
                      styles.statusOption,
                      {
                        borderColor: editStatus === s ? colors.accent : colors.border,
                        backgroundColor: editStatus === s ? colors.accent + "18" : "transparent",
                      },
                    ]}
                    onPress={() => setEditStatus(s)}
                  >
                    <Text style={[styles.statusOptionText, { color: editStatus === s ? colors.accent : colors.textSecondary, fontFamily: "Inter_500Medium" }]}>
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.editFieldLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>SERVICES</Text>
              <View style={styles.chipsRow}>
                {ALL_SERVICES.map((svc) => {
                  const active = editServices.includes(svc);
                  return (
                    <Pressable
                      key={svc}
                      onPress={() => toggleEditService(svc)}
                      style={[
                        styles.editChip,
                        {
                          backgroundColor: active ? colors.accent : colors.background,
                          borderColor: active ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      {active && <Ionicons name="checkmark" size={12} color="#fff" />}
                      <Text style={[styles.editChipText, { color: active ? "#fff" : colors.textSecondary, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                        {svc}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={[styles.saveBtn, { backgroundColor: colors.accent, opacity: saveMutation.isPending ? 0.7 : 1 }]}
                onPress={() => {
                  if (!editName.trim()) return Alert.alert("Required", "Name is required");
                  saveMutation.mutate();
                }}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.saveBtnText, { fontFamily: "Inter_700Bold" }]}>Save Changes</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeactivate} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.confirmTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
              Deactivate Clinic
            </Text>
            <Text style={[styles.confirmSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              This will set the clinic status to INACTIVE. You can reactivate it later.
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable style={[styles.confirmBtn, { borderColor: colors.border }]} onPress={() => setShowDeactivate(false)}>
                <Text style={[styles.confirmBtnText, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, { backgroundColor: colors.error, borderColor: colors.error, opacity: deactivateMutation.isPending ? 0.7 : 1 }]}
                onPress={() => deactivateMutation.mutate()}
                disabled={deactivateMutation.isPending}
              >
                {deactivateMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.confirmBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>Deactivate</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SectionCard({
  children,
  colors,
  label,
  noPad,
}: {
  children: React.ReactNode;
  colors: typeof Colors.light;
  label: string;
  noPad?: boolean;
}) {
  return (
    <>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
        {label}
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
          noPad && { padding: 0 },
        ]}
      >
        {children}
      </View>
    </>
  );
}

function InfoRow({
  icon,
  children,
  colors,
  tappable,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  colors: typeof Colors.light;
  tappable?: boolean;
}) {
  return (
    <View style={[styles.infoRow, tappable && { paddingVertical: 8 }]}>
      <View style={[styles.infoIcon, { backgroundColor: colors.accent + "18" }]}>
        <Ionicons name={icon} size={15} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>{children}</View>
      {tappable && <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />}
    </View>
  );
}

function KpiTile({
  icon,
  label,
  value,
  valueColor,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={[styles.kpiTile, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Ionicons name={icon} size={16} color={colors.accent} />
      <Text style={[styles.kpiValue, { color: valueColor ?? colors.text, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.kpiLabel, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
        {label}
      </Text>
    </View>
  );
}

function EditField({
  label,
  value,
  onChange,
  keyboardType,
  colors,
  maxLength,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: "default" | "decimal-pad" | "number-pad";
  colors: typeof Colors.light;
  maxLength?: number;
  autoCapitalize?: "none" | "characters" | "words";
}) {
  return (
    <View style={styles.editFieldGroup}>
      <Text style={[styles.editFieldLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        style={[styles.editInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background, fontFamily: "Inter_400Regular" }]}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? "default"}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heroHeader: { paddingHorizontal: 16, paddingBottom: 20 },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginTop: 2 },
  heroCenter: { flex: 1, gap: 8 },
  heroName: { fontSize: 22, color: "#fff", lineHeight: 28 },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroCreated: { fontSize: 12, color: "rgba(255,255,255,0.65)" },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginTop: 2 },
  content: { padding: 16, gap: 6 },
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 14, marginBottom: 6 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  serviceChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  serviceChipText: { fontSize: 13 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  infoIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  infoText: { fontSize: 14, lineHeight: 20 },
  kpiRow: { flexDirection: "row", gap: 8 },
  kpiTile: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center", gap: 4 },
  kpiValue: { fontSize: 13, textAlign: "center" },
  kpiLabel: { fontSize: 10, textAlign: "center" },
  invBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  invBannerText: { fontSize: 13, flex: 1 },
  divider: { height: StyleSheet.hairlineWidth },
  managerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 14 },
  managerEmail: { flex: 1, fontSize: 14 },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  invRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  invLeft: { flex: 1, gap: 2 },
  invPeriod: { fontSize: 14 },
  invMeta: { fontSize: 12 },
  invChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  invChipText: { fontSize: 11 },
  actionsCol: { gap: 8, marginTop: 14 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  actionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  actionText: { flex: 1, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  editSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%", overflow: "hidden" },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#ccc", alignSelf: "center", marginTop: 10 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16 },
  sheetTitle: { fontSize: 20 },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 4 },
  editFieldGroup: { gap: 5, marginBottom: 12 },
  editFieldLabel: { fontSize: 11, letterSpacing: 0.5 },
  editInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  statusRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statusOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  statusOptionText: { fontSize: 12 },
  editChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5 },
  editChipText: { fontSize: 13 },
  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 16 },
  saveBtnText: { color: "#fff", fontSize: 16 },
  confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  confirmModal: { borderRadius: 16, padding: 24, width: "85%", gap: 12 },
  confirmTitle: { fontSize: 18 },
  confirmSub: { fontSize: 14, lineHeight: 20 },
  confirmButtons: { flexDirection: "row", gap: 10, marginTop: 4 },
  confirmBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1 },
  confirmBtnText: { fontSize: 15 },
});
