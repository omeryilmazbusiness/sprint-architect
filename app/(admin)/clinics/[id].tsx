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
  Linking,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  Card, SectionHeader, StatusPill, Divider,
  TextField, PrimaryButton, DestructiveButton, LoadingState, ErrorState,
} from "@/components/ui";
import {
  getClinicDetail, updateClinic, deactivateClinic,
  ClinicDetail, InvoiceSummary,
} from "@/lib/api/adminClinics";
import { SERVICES, serviceLabel } from "@/constants/services";
import CreateUserSheet from "@/components/admin/CreateUserSheet";

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function invStatusColor(inv: InvoiceSummary): string {
  if (inv.status === "PAID") return T.success;
  if (inv.status === "UNPAID") return T.danger;
  return T.warning;
}

export default function ClinicDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [showEdit, setShowEdit] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);

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
    mutationFn: () => updateClinic(id, {
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

  if (isLoading) return (
    <View style={styles.root}>
      <AdminHeader title="Clinic Detail" backButton onBack={() => router.back()} />
      <LoadingState message="Loading clinic…" />
    </View>
  );
  if (isError || !data) return (
    <View style={styles.root}>
      <AdminHeader title="Clinic Detail" backButton onBack={() => router.back()} />
      <ErrorState onRetry={refetch} />
    </View>
  );

  const currentInv = data.currentPeriodInvoice;

  return (
    <View style={styles.root}>
      <AdminHeader
        title={data.name}
        backButton
        onBack={() => router.back()}
        right={
          <Pressable
            style={({ pressed }) => [styles.editIconBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={openEdit}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={20} color={T.primary} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.statusCard}>
          <View style={styles.statusCardRow}>
            <View style={styles.clinicBadge}>
              <Text style={styles.clinicBadgeText}>{data.name.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.clinicName}>{data.name}</Text>
              <Text style={styles.clinicSince}>Since {fmt(data.createdAt)}</Text>
            </View>
            <StatusPill status={data.status} />
          </View>
          {data.status === "SUSPENDED" && (
            <View style={styles.suspendedBanner}>
              <Ionicons name="warning-outline" size={14} color={T.danger} />
              <Text style={styles.suspendedText}>Clinic suspended — billing overdue</Text>
            </View>
          )}
        </Card>

        {(data.services?.length > 0) && (
          <>
            <SectionHeader label="Services" style={styles.sectionGap} />
            <Card>
              <View style={styles.chipsRow}>
                {data.services.map((svc) => (
                  <View key={svc} style={styles.serviceChip}>
                    <Ionicons name="medical-outline" size={12} color={T.accent} />
                    <Text style={styles.serviceChipText}>{serviceLabel(svc)}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </>
        )}

        {(data.address || data.contactPhone || data.contactEmail || data.websiteUrl || data.billingEmail) && (
          <>
            <SectionHeader label="Contact & Address" style={styles.sectionGap} />
            <Card noPad>
              {data.address && (
                <View style={styles.contactRow}>
                  <View style={styles.contactIcon}><Ionicons name="location-outline" size={16} color={T.accent} /></View>
                  <Text style={styles.contactText}>{data.address}</Text>
                </View>
              )}
              {data.address && (data.contactPhone || data.contactEmail || data.websiteUrl || data.billingEmail) && <Divider inset={52} />}
              {data.contactPhone && (
                <Pressable onPress={() => Linking.openURL(`tel:${data.contactPhone}`)}>
                  <View style={styles.contactRow}>
                    <View style={styles.contactIcon}><Ionicons name="call-outline" size={16} color={T.accent} /></View>
                    <Text style={[styles.contactText, { color: T.accent }]}>{data.contactPhone}</Text>
                    <Ionicons name="chevron-forward" size={13} color={T.textMuted} />
                  </View>
                </Pressable>
              )}
              {data.contactPhone && data.contactEmail && <Divider inset={52} />}
              {data.contactEmail && (
                <Pressable onPress={() => Linking.openURL(`mailto:${data.contactEmail}`)}>
                  <View style={styles.contactRow}>
                    <View style={styles.contactIcon}><Ionicons name="mail-outline" size={16} color={T.accent} /></View>
                    <Text style={[styles.contactText, { color: T.accent }]}>{data.contactEmail}</Text>
                    <Ionicons name="chevron-forward" size={13} color={T.textMuted} />
                  </View>
                </Pressable>
              )}
              {data.contactEmail && data.websiteUrl && <Divider inset={52} />}
              {data.websiteUrl && (
                <Pressable onPress={() => Linking.openURL(data.websiteUrl!)}>
                  <View style={styles.contactRow}>
                    <View style={styles.contactIcon}><Ionicons name="globe-outline" size={16} color={T.accent} /></View>
                    <Text style={[styles.contactText, { color: T.accent }]} numberOfLines={1}>{data.websiteUrl}</Text>
                    <Ionicons name="chevron-forward" size={13} color={T.textMuted} />
                  </View>
                </Pressable>
              )}
              {(data.address || data.contactPhone || data.contactEmail || data.websiteUrl) && data.billingEmail && <Divider inset={52} />}
              {data.billingEmail && (
                <Pressable onPress={() => Linking.openURL(`mailto:${data.billingEmail}`)}>
                  <View style={styles.contactRow}>
                    <View style={styles.contactIcon}><Ionicons name="receipt-outline" size={16} color={T.accent} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactMeta}>Billing Email</Text>
                      <Text style={[styles.contactText, { color: T.accent }]}>{data.billingEmail}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={13} color={T.textMuted} />
                  </View>
                </Pressable>
              )}
            </Card>
          </>
        )}

        {data.notes && (
          <>
            <SectionHeader label="Notes" style={styles.sectionGap} />
            <Card>
              <Text style={styles.notesText}>{data.notes}</Text>
            </Card>
          </>
        )}

        <SectionHeader label="Billing Summary" style={styles.sectionGap} />
        <Card>
          <View style={styles.billingGrid}>
            <BillingTile icon="calendar-outline" label="Billing Day" value={`Day ${data.billingAnchorDay}`} />
            <BillingTile icon="arrow-forward-circle-outline" label="Next Invoice" value={fmt(data.nextInvoiceDate)} />
            <BillingTile
              icon="document-text-outline"
              label="This Period"
              value={currentInv?.status ?? "No invoice"}
              valueColor={currentInv ? invStatusColor(currentInv) : undefined}
            />
          </View>
          {currentInv && (
            <View style={[styles.invBanner, { backgroundColor: invStatusColor(currentInv) + "10", borderColor: invStatusColor(currentInv) + "25" }]}>
              <Ionicons name="receipt-outline" size={13} color={invStatusColor(currentInv)} />
              <Text style={[styles.invBannerText, { color: invStatusColor(currentInv) }]}>
                {currentInv.period} · {currentInv.patientCount} patients · {currentInv.currency} {currentInv.total.toFixed(2)}
              </Text>
            </View>
          )}
        </Card>

        {data.managers.length > 0 && (
          <>
            <SectionHeader label="Managers" style={styles.sectionGap} />
            <Card noPad>
              {data.managers.map((mgr, i) => (
                <View key={mgr.id}>
                  {i > 0 && <Divider inset={52} />}
                  <View style={styles.managerRow}>
                    <View style={styles.mgrAvatar}>
                      <Text style={styles.mgrAvatarText}>
                        {(mgr.fullName ?? mgr.email).slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mgrEmail} numberOfLines={1}>
                        {mgr.fullName ?? mgr.email}
                      </Text>
                      {mgr.fullName && (
                        <Text style={styles.mgrSub} numberOfLines={1}>{mgr.email}</Text>
                      )}
                    </View>
                    <StatusPill status={mgr.status} small />
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        {data.invoiceTimeline.length > 0 && (
          <>
            <SectionHeader label="Invoice History" style={styles.sectionGap} />
            <Card noPad>
              {data.invoiceTimeline.map((inv, i) => {
                const sc = invStatusColor(inv);
                return (
                  <View key={inv.id}>
                    {i > 0 && <Divider />}
                    <Pressable
                      style={({ pressed }) => [styles.invRow, { opacity: pressed ? 0.7 : 1 }]}
                      onPress={() => router.push({ pathname: "/(admin)/invoices/[id]", params: { id: inv.id } })}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.invPeriod}>{inv.period}</Text>
                        <Text style={styles.invMeta}>{inv.patientCount} patients · {inv.currency} {inv.total.toFixed(2)}</Text>
                      </View>
                      <StatusPill status={inv.status} small />
                      <Ionicons name="chevron-forward" size={13} color={T.textMuted} />
                    </Pressable>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        <SectionHeader label="Actions" style={styles.sectionGap} />
        <Card noPad>
          <Pressable
            style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => setShowCreateUser(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: T.primary + "12" }]}>
              <Ionicons name="person-add-outline" size={16} color={T.primary} />
            </View>
            <Text style={styles.actionText}>Create Manager</Text>
            <Ionicons name="chevron-forward" size={14} color={T.textMuted} />
          </Pressable>
          <Divider inset={52} />
          <Pressable
            style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push({ pathname: "/(admin)/invoices", params: { clinicId: id } })}
          >
            <View style={[styles.actionIcon, { backgroundColor: T.warning + "12" }]}>
              <Ionicons name="document-text-outline" size={16} color={T.warning} />
            </View>
            <Text style={styles.actionText}>View Invoices</Text>
            <Ionicons name="chevron-forward" size={14} color={T.textMuted} />
          </Pressable>
          <Divider inset={52} />
          <Pressable
            style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => setShowDeactivate(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: T.dangerBg }]}>
              <Ionicons name="trash-outline" size={16} color={T.danger} />
            </View>
            <Text style={[styles.actionText, { color: T.danger }]}>Delete Clinic</Text>
            <Ionicons name="chevron-forward" size={14} color={T.danger} />
          </Pressable>
        </Card>
      </ScrollView>

      <Modal visible={showEdit} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>Edit Clinic</Text>
              <Pressable onPress={() => setShowEdit(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={T.textSec} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
              <View style={styles.editFields}>
                <TextField label="Clinic Name" value={editName} onChangeText={setEditName} />
                <TextField label="Currency (3-letter)" value={editCurrency} onChangeText={setEditCurrency} maxLength={3} autoCapitalize="characters" />
                <TextField label="Unit Price (optional)" value={editPrice} onChangeText={setEditPrice} keyboardType="decimal-pad" />
                <TextField label="Billing Anchor Day (1–28)" value={editAnchorDay} onChangeText={setEditAnchorDay} keyboardType="number-pad" />
              </View>
              <Text style={styles.editLabel}>STATUS</Text>
              <View style={styles.statusRow}>
                {(["ACTIVE", "INACTIVE", "SUSPENDED"] as const).map((s) => (
                  <Pressable
                    key={s}
                    style={[styles.statusOption, editStatus === s ? styles.statusOptionActive : styles.statusOptionInactive]}
                    onPress={() => setEditStatus(s)}
                  >
                    <Text style={[styles.statusOptionText, { color: editStatus === s ? T.primary : T.textSec }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.editLabel}>SERVICES</Text>
              <View style={styles.chipsRow}>
                {SERVICES.map((svc) => {
                  const active = editServices.includes(svc.code);
                  return (
                    <Pressable
                      key={svc.code}
                      onPress={() => setEditServices((prev) => prev.includes(svc.code) ? prev.filter((s) => s !== svc.code) : [...prev, svc.code])}
                      style={[styles.editChip, active ? styles.editChipActive : styles.editChipInactive]}
                    >
                      {active && <Ionicons name="checkmark" size={12} color="#fff" />}
                      <Text style={[styles.editChipText, { color: active ? "#fff" : T.textSec }]}>{svc.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <PrimaryButton
                label="Save Changes"
                loading={saveMutation.isPending}
                onPress={() => {
                  if (!editName.trim()) return Alert.alert("Required", "Name is required");
                  saveMutation.mutate();
                }}
                style={styles.saveBtn}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeactivate} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={[styles.confirmIcon, { backgroundColor: T.dangerBg }]}>
              <Ionicons name="trash-outline" size={28} color={T.danger} />
            </View>
            <Text style={styles.confirmTitle}>Delete Clinic</Text>
            <Text style={styles.confirmSub}>
              This will permanently deactivate "{data?.name}" and suspend all associated manager accounts. This action cannot be easily undone.
            </Text>
            <View style={styles.confirmBtns}>
              <Pressable style={[styles.confirmBtn, { borderColor: T.border }]} onPress={() => setShowDeactivate(false)}>
                <Text style={[styles.confirmBtnText, { color: T.textSec }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, { backgroundColor: T.danger, borderColor: T.danger, opacity: deactivateMutation.isPending ? 0.7 : 1 }]}
                onPress={() => deactivateMutation.mutate()}
                disabled={deactivateMutation.isPending}
              >
                {deactivateMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
                  <Text style={[styles.confirmBtnText, { color: "#fff" }]}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <CreateUserSheet
        visible={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["/v1/admin/clinics", id, "detail"] });
        }}
        defaultRole="MANAGER"
        preselectedClinicId={id}
        preselectedClinicName={data?.name}
      />
    </View>
  );
}

function BillingTile({ icon, label, value, valueColor }: { icon: string; label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.billingTile}>
      <Ionicons name={icon as any} size={14} color={T.accent} />
      <Text style={[styles.billingValue, valueColor ? { color: valueColor } : {}]} numberOfLines={1}>{value}</Text>
      <Text style={styles.billingLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  editIconBtn: { width: 36, height: 36, borderRadius: T.r8, backgroundColor: T.primary + "12", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: T.border },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 4 },
  sectionGap: { marginTop: 20 },
  statusCard: { gap: 0 },
  statusCardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  clinicBadge: { width: 44, height: 44, borderRadius: T.r12, backgroundColor: T.primary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  clinicBadgeText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
  clinicName: { fontFamily: "Inter_700Bold", fontSize: 17, color: T.text },
  clinicSince: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textSec },
  suspendedBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: T.dangerBg, borderRadius: T.r8, padding: 10, marginTop: 12 },
  suspendedText: { fontFamily: "Inter_500Medium", fontSize: 12, color: T.danger, flex: 1 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  serviceChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: T.accent + "12", borderWidth: 1, borderColor: T.accent + "30" },
  serviceChipText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: T.accent },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 13 },
  contactIcon: { width: 32, height: 32, borderRadius: T.r8, backgroundColor: T.accent + "12", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  contactText: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.text, flex: 1 },
  contactMeta: { fontFamily: "Inter_400Regular", fontSize: 11, color: T.textMuted, marginBottom: 2 },
  notesText: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textSec, lineHeight: 20 },
  billingGrid: { flexDirection: "row", gap: 8, marginBottom: 12 },
  billingTile: { flex: 1, backgroundColor: T.surfaceSubtle, borderRadius: T.r10, borderWidth: 1, borderColor: T.border, padding: 10, alignItems: "center", gap: 4 },
  billingValue: { fontFamily: "Inter_700Bold", fontSize: 13, color: T.text, textAlign: "center" },
  billingLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: T.textMuted, textAlign: "center" },
  invBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: T.r8, padding: 10 },
  invBannerText: { fontFamily: "Inter_500Medium", fontSize: 12, flex: 1 },
  managerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  mgrAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: T.primary + "12", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  mgrAvatarText: { fontFamily: "Inter_700Bold", fontSize: 12, color: T.primary },
  mgrEmail: { fontFamily: "Inter_500Medium", fontSize: 14, color: T.text },
  mgrSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted, marginTop: 1 },
  invRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 10 },
  invPeriod: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: T.text },
  invMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted, marginTop: 2 },
  actionRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 10 },
  actionIcon: { width: 32, height: 32, borderRadius: T.r8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  actionText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, color: T.text },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: T.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%", paddingBottom: 30 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  sheetHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: T.text },
  sheetContent: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  editFields: { gap: 14 },
  editLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.5, color: T.textSec, marginTop: 4 },
  statusRow: { flexDirection: "row", gap: 8 },
  statusOption: { flex: 1, paddingVertical: 10, borderRadius: T.r10, borderWidth: 1.5, alignItems: "center" },
  statusOptionActive: { borderColor: T.primary, backgroundColor: T.primary + "10" },
  statusOptionInactive: { borderColor: T.border, backgroundColor: "transparent" },
  statusOptionText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  editChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: T.r8, borderWidth: 1.5 },
  editChipActive: { backgroundColor: T.primary, borderColor: T.primary },
  editChipInactive: { backgroundColor: "transparent", borderColor: T.border },
  editChipText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  saveBtn: { marginTop: 8, width: "100%" },
  confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  confirmModal: { backgroundColor: T.surface, borderRadius: T.r20, padding: 24, width: "85%", alignItems: "center", gap: 12 },
  confirmIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  confirmTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: T.text },
  confirmSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textSec, textAlign: "center", lineHeight: 20 },
  confirmBtns: { flexDirection: "row", gap: 10, width: "100%" },
  confirmBtn: { flex: 1, borderRadius: T.r10, paddingVertical: 13, alignItems: "center", borderWidth: 1.5 },
  confirmBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
