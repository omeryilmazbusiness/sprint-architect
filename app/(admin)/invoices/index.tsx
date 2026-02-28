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
  useColorScheme,
  Platform,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { EmptyState } from "@/components/EmptyState";
import { LoadingView } from "@/components/LoadingView";
import { ErrorView } from "@/components/ErrorView";
import { listAdminInvoices, generateInvoices, AdminInvoice } from "@/lib/api/adminInvoices";

const STATUS_FILTERS = ["ALL", "DRAFT", "ISSUED", "PAID"];

function statusColor(status: string, colors: typeof Colors.light): string {
  if (status === "PAID") return colors.success;
  if (status === "ISSUED") return colors.accent;
  return colors.warning;
}

export default function AdminInvoicesScreen() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [period, setPeriod] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showGenerate, setShowGenerate] = useState(false);
  const [generatePeriod, setGeneratePeriod] = useState("");

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<AdminInvoice[]>({
    queryKey: ["/v1/admin/invoices", period, statusFilter],
    queryFn: () => listAdminInvoices({
      period: period || undefined,
      status: statusFilter !== "ALL" ? statusFilter : undefined,
    }),
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

  if (isLoading) return <LoadingView message="Loading invoices..." />;
  if (isError) return <ErrorView onRetry={refetch} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Invoices</Text>
          <Pressable
            style={[styles.generateBtn, { backgroundColor: colors.accent }]}
            onPress={() => setShowGenerate(true)}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={[styles.generateBtnText, { fontFamily: "Inter_600SemiBold" }]}>Generate</Text>
          </Pressable>
        </View>
        <TextInput
          style={[styles.periodInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, fontFamily: "Inter_400Regular" }]}
          placeholder="Filter by period (YYYY-MM)"
          placeholderTextColor={colors.textMuted}
          value={period}
          onChangeText={setPeriod}
          maxLength={7}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {STATUS_FILTERS.map((s) => (
            <Pressable
              key={s}
              style={[styles.filterChip, { borderColor: statusFilter === s ? colors.accent : colors.border, backgroundColor: statusFilter === s ? colors.accent + "18" : "transparent" }]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.filterChipText, { color: statusFilter === s ? colors.accent : colors.textSecondary, fontFamily: "Inter_500Medium" }]}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
        scrollEnabled={!!(data?.length)}
        ListEmptyComponent={<EmptyState icon="document-text-outline" title="No invoices found" subtitle="Generate invoices for a billing period" />}
        renderItem={({ item }) => {
          const sColor = statusColor(item.status, colors);
          return (
            <Pressable
              style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => router.push({ pathname: "/(admin)/invoices/[id]", params: { id: item.id } })}
            >
              <View style={styles.cardTop}>
                <View>
                  <Text style={[styles.clinicName, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                    {item.clinic?.name ?? "Unknown Clinic"}
                  </Text>
                  <Text style={[styles.period, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{item.period}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: sColor + "20" }]}>
                  <Text style={[styles.statusText, { color: sColor, fontFamily: "Inter_600SemiBold" }]}>{item.status}</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={13} color={colors.textMuted} />
                  <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {item.patientCount} patients
                  </Text>
                </View>
                <Text style={[styles.total, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
                  {item.currency} {item.total.toFixed(2)}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />

      <Modal visible={showGenerate} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Generate Invoices</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Creates or updates invoices for all active clinics in the given period.
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background, fontFamily: "Inter_400Regular" }]}
              placeholder="Period (YYYY-MM)"
              placeholderTextColor={colors.textMuted}
              value={generatePeriod}
              onChangeText={setGeneratePeriod}
              maxLength={7}
            />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => { setShowGenerate(false); setGeneratePeriod(""); }}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.accent, borderColor: colors.accent, opacity: generateMutation.isPending ? 0.7 : 1 }]}
                onPress={() => { if (!generatePeriod.trim()) return Alert.alert("Validation", "Period is required (YYYY-MM)"); generateMutation.mutate(generatePeriod.trim()); }}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[styles.modalBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>Generate</Text>}
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
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  title: { fontSize: 26 },
  generateBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  generateBtnText: { color: "#fff", fontSize: 13 },
  periodInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 10 },
  filterRow: { marginBottom: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  filterChipText: { fontSize: 13 },
  list: { padding: 16, gap: 10 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  clinicName: { fontSize: 15, flex: 1 },
  period: { fontSize: 13, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11 },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13 },
  total: { fontSize: 16 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  modal: { borderRadius: 16, padding: 24, width: "85%", gap: 14 },
  modalTitle: { fontSize: 18 },
  modalSub: { fontSize: 13, lineHeight: 18 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  modalButtons: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1 },
  modalBtnText: { fontSize: 15 },
});
