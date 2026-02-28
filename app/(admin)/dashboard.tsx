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
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { getAdminMetrics, generateInvoices, AdminMetrics } from "@/lib/api/adminInvoices";
import { createClinic } from "@/lib/api/adminClinics";
import { createUser } from "@/lib/api/adminUsers";
import { listClinics } from "@/lib/api/adminClinics";

export default function AdminDashboard() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [generatePeriod, setGeneratePeriod] = useState("");
  const [showGenerate, setShowGenerate] = useState(false);

  const { data: metrics, isLoading } = useQuery<AdminMetrics>({
    queryKey: ["/v1/admin/metrics"],
    queryFn: getAdminMetrics,
  });

  const generateMutation = useMutation({
    mutationFn: generateInvoices,
    onSuccess: (data) => {
      setShowGenerate(false);
      setGeneratePeriod("");
      qc.invalidateQueries({ queryKey: ["/v1/admin/invoices"] });
      Alert.alert("Done", `Generated ${data.length} invoice(s) for ${generatePeriod}.`);
    },
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to generate"),
  });

  function MetricCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
    return (
      <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.metricDot, { backgroundColor: color }]} />
        <Text style={[styles.metricValue, { color: colors.text, fontFamily: "Inter_700Bold" }]}>{value}</Text>
        <Text style={[styles.metricLabel, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>{label}</Text>
        {sub ? <Text style={[styles.metricSub, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>{sub}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={colors.gradient} style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Admin Console</Text>
        <Text style={[styles.headerSub, { fontFamily: "Inter_400Regular" }]}>System overview</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
        ) : metrics ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              CLINICS
            </Text>
            <View style={styles.metricsRow}>
              <MetricCard label="Total" value={metrics.clinics.total} color={colors.accent} />
              <MetricCard label="Active" value={metrics.clinics.active} color={colors.success} />
              <MetricCard label="Inactive" value={metrics.clinics.inactive} color={colors.statusInactive} />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              USERS
            </Text>
            <View style={styles.metricsRow}>
              <MetricCard label="Total" value={metrics.users.total} color={colors.accent} />
              <MetricCard label="Active" value={metrics.users.active} color={colors.success} />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              INVOICES
            </Text>
            <View style={styles.metricsRow}>
              <MetricCard label="Draft" value={metrics.invoices.draft} color={colors.warning} />
              <MetricCard label="Issued" value={metrics.invoices.issued} color={colors.accent} />
              <MetricCard label="Paid" value={metrics.invoices.paid} color={colors.success} />
            </View>
          </>
        ) : null}

        <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold", marginTop: 8 }]}>
          QUICK ACTIONS
        </Text>
        <View style={[styles.actionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <QuickAction
            icon="business-outline"
            label="Create Clinic"
            colors={colors}
            onPress={() => router.push("/(admin)/clinics")}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <QuickAction
            icon="person-add-outline"
            label="Create User"
            colors={colors}
            onPress={() => router.push("/(admin)/users")}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <QuickAction
            icon="receipt-outline"
            label="Generate Invoices"
            colors={colors}
            onPress={() => setShowGenerate(true)}
          />
        </View>
      </ScrollView>

      <Modal visible={showGenerate} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
              Generate Invoices
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background, fontFamily: "Inter_400Regular" }]}
              placeholder="Period (YYYY-MM)"
              placeholderTextColor={colors.textMuted}
              value={generatePeriod}
              onChangeText={setGeneratePeriod}
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => { setShowGenerate(false); setGeneratePeriod(""); }}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: colors.accent, opacity: generateMutation.isPending ? 0.7 : 1 }]}
                onPress={() => { if (generatePeriod.trim()) generateMutation.mutate(generatePeriod.trim()); }}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>Generate</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function QuickAction({ icon, label, colors, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: typeof Colors.light;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.7 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.qaIcon, { backgroundColor: colors.accent + "18" }]}>
        <Ionicons name={icon} size={20} color={colors.accent} />
      </View>
      <Text style={[styles.qaLabel, { color: colors.text, fontFamily: "Inter_500Medium" }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 26, color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  content: { padding: 16 },
  sectionTitle: { fontSize: 11, letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  metricsRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  metricDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 8 },
  metricValue: { fontSize: 26 },
  metricLabel: { fontSize: 11, marginTop: 2 },
  metricSub: { fontSize: 10, marginTop: 2 },
  actionsCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  divider: { height: 1 },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  qaIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  qaLabel: { flex: 1, fontSize: 15 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  modal: { borderRadius: 16, padding: 24, width: "85%", gap: 16 },
  modalTitle: { fontSize: 18 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  modalButtons: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1 },
  modalBtnPrimary: { borderWidth: 0 },
  modalBtnText: { fontSize: 15 },
});
