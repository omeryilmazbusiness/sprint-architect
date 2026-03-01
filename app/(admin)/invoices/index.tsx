import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusPill, EmptyState, LoadingState, ErrorState } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { listAdminInvoices, generateInvoices, InvoiceListResponse } from "@/lib/api/adminInvoices";

const STATUS_FILTERS = ["ALL", "PENDING", "UNPAID", "PAID"] as const;
const PERIOD_REGEX = /^\d{4}-\d{2}$/;

function statusAccent(status: string): string {
  if (status === "PAID") return T.success;
  if (status === "UNPAID") return T.danger;
  if (status === "PENDING") return T.warning;
  return T.accent;
}

export default function AdminInvoicesScreen() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [period, setPeriod] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [showGenerate, setShowGenerate] = useState(false);
  const [generatePeriod, setGeneratePeriod] = useState("");

  const validPeriod = period.length === 7 && PERIOD_REGEX.test(period) ? period : undefined;

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<InvoiceListResponse>({
    queryKey: ["/v1/admin/invoices", validPeriod, statusFilter],
    queryFn: () => listAdminInvoices({ period: validPeriod, status: statusFilter !== "ALL" ? statusFilter : undefined }),
  });

  const generateMutation = useMutation({
    mutationFn: generateInvoices,
    onSuccess: (result) => {
      setShowGenerate(false);
      setGeneratePeriod("");
      qc.invalidateQueries({ queryKey: ["/v1/admin/invoices"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/metrics"] });
      Alert.alert("Done", `Generated/updated ${result.length} invoice(s) for ${generatePeriod}.`);
    },
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to generate"),
  });

  async function handleLogout() { await logout(); router.replace("/(auth)/login"); }

  return (
    <View style={styles.root}>
      <AdminHeader
        title="Invoices"
        userEmail={user?.email}
        onLogout={handleLogout}
        right={
          <Pressable style={styles.genBtn} onPress={() => setShowGenerate(true)}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.genBtnText}>Generate</Text>
          </Pressable>
        }
      />

      <View style={styles.filterArea}>
        <View style={styles.periodRow}>
          <Ionicons name="calendar-outline" size={16} color={T.textMuted} />
          <TextInput
            style={[styles.periodInput, period && !validPeriod ? { color: T.danger } : null]}
            placeholder="Filter by period (YYYY-MM)"
            placeholderTextColor={T.textMuted}
            value={period}
            onChangeText={setPeriod}
            maxLength={7}
            autoCapitalize="none"
          />
          {period.length > 0 && (
            <Pressable onPress={() => setPeriod("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={T.textMuted} />
            </Pressable>
          )}
        </View>
        {period.length > 0 && !validPeriod && (
          <Text style={styles.periodHint}>Enter a complete period, e.g. 2026-02</Text>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {STATUS_FILTERS.map((s) => {
            const c = s === "ALL" ? T.primary : statusAccent(s);
            const active = statusFilter === s;
            return (
              <Pressable
                key={s}
                style={[styles.chip, active ? { backgroundColor: c + "15", borderColor: c } : styles.chipInactive]}
                onPress={() => setStatusFilter(s)}
              >
                {s !== "ALL" && (
                  <View style={[styles.dot, { backgroundColor: c }]} />
                )}
                <Text style={[styles.chipText, { color: active ? c : T.textSec }]}>{s}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <LoadingState message="Loading invoices…" />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={data?.rows ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />}
          scrollEnabled={!!(data?.rows?.length)}
          ListHeaderComponent={data ? (
            <Text style={styles.countLabel}>{data.total} invoice{data.total !== 1 ? "s" : ""}</Text>
          ) : null}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="No invoices found"
              subtitle={validPeriod || statusFilter !== "ALL" ? "Try clearing your filters" : "Generate invoices for a billing period"}
            />
          }
          renderItem={({ item }) => {
            const sc = statusAccent(item.status);
            return (
              <Pressable
                style={({ pressed }) => [styles.card, cardShadow, { opacity: pressed ? 0.85 : 1 }]}
                onPress={() => router.push({ pathname: "/(admin)/invoices/[id]", params: { id: item.id } })}
              >
                <View style={styles.cardLeft}>
                  <View style={[styles.invIcon, { backgroundColor: sc + "15" }]}>
                    <Ionicons name="document-text-outline" size={18} color={sc} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.clinicName} numberOfLines={1}>{item.clinic?.name ?? "Unknown Clinic"}</Text>
                    <View style={styles.cardMeta}>
                      <Text style={styles.period}>{item.period}</Text>
                      <Text style={styles.metaDot}>·</Text>
                      <Ionicons name="people-outline" size={12} color={T.textMuted} />
                      <Text style={styles.patCount}>{item.patientCount}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.total, { color: T.text }]}>{item.currency} {item.total.toFixed(2)}</Text>
                  <StatusPill status={item.status} small />
                  <Ionicons name="chevron-forward" size={13} color={T.textMuted} />
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <Modal visible={showGenerate} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={[styles.modalIcon, { backgroundColor: T.primary + "12" }]}>
              <Ionicons name="document-text-outline" size={28} color={T.primary} />
            </View>
            <Text style={styles.modalTitle}>Generate Invoices</Text>
            <Text style={styles.modalSub}>Creates or updates invoices for all active clinics in the given period.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Period (YYYY-MM)"
              placeholderTextColor={T.textMuted}
              value={generatePeriod}
              onChangeText={setGeneratePeriod}
              maxLength={7}
              autoCapitalize="none"
            />
            <View style={styles.modalBtns}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => { setShowGenerate(false); setGeneratePeriod(""); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, { opacity: generateMutation.isPending ? 0.7 : 1 }]}
                onPress={() => {
                  const p = generatePeriod.trim();
                  if (!p || !PERIOD_REGEX.test(p)) return Alert.alert("Validation", "Enter a valid period (YYYY-MM), e.g. 2026-02");
                  generateMutation.mutate(p);
                }}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Generate</Text>
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
  root: { flex: 1, backgroundColor: T.bg },
  genBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: T.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: T.r8 },
  genBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  filterArea: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border, paddingBottom: 8 },
  periodRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
  periodInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: T.text },
  periodHint: { fontFamily: "Inter_400Regular", fontSize: 11, color: T.danger, paddingHorizontal: 16, marginTop: 2 },
  chipsScroll: { paddingHorizontal: 16, paddingVertical: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  chipInactive: { backgroundColor: "transparent", borderColor: T.border },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  countLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted, paddingHorizontal: 16, paddingVertical: 8 },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: T.surface, borderRadius: T.r14, borderWidth: 1, borderColor: T.border, padding: 14, gap: 12 },
  cardLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  invIcon: { width: 40, height: 40, borderRadius: T.r10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  clinicName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: T.text },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  period: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textSec },
  metaDot: { color: T.textMuted, fontSize: 12 },
  patCount: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textSec },
  cardRight: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  total: { fontFamily: "Inter_700Bold", fontSize: 14 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  modal: { backgroundColor: T.surface, borderRadius: T.r20, padding: 24, width: "85%", gap: 14, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 16 },
  modalIcon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: T.text },
  modalSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: T.textSec, textAlign: "center", lineHeight: 18 },
  modalInput: { width: "100%", fontFamily: "Inter_400Regular", fontSize: 15, color: T.text, backgroundColor: T.surfaceSubtle, borderWidth: 1.5, borderColor: T.border, borderRadius: T.r10, paddingHorizontal: 14, paddingVertical: 12 },
  modalBtns: { flexDirection: "row", gap: 10, width: "100%" },
  modalCancelBtn: { flex: 1, borderRadius: T.r10, paddingVertical: 13, alignItems: "center", borderWidth: 1.5, borderColor: T.border },
  modalCancelText: { fontFamily: "Inter_500Medium", fontSize: 15, color: T.textSec },
  modalConfirmBtn: { flex: 1, borderRadius: T.r10, paddingVertical: 13, alignItems: "center", backgroundColor: T.primary },
  modalConfirmText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
});
