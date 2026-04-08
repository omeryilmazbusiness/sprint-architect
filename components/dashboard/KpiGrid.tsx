import React from "react";
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import type { AdminDashboardData } from "@/lib/api/adminDashboard";
import { goToInvoices, goToClinics } from "@/services/navigation/filteredNavigation";
import { useT } from "@/hooks/useT";

interface KpiCardProps {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  sub?: string;
  onPress?: () => void;
  cardWidth: number;
}

function KpiCard({ label, value, icon, color, sub, onPress, cardWidth }: KpiCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        cardShadow,
        { width: cardWidth, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconWrap, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {sub && <Text style={styles.sub}>{sub}</Text>}
    </Pressable>
  );
}

function SkeletonCard({ cardWidth }: { cardWidth: number }) {
  return <View style={[styles.card, { width: cardWidth, backgroundColor: "#EEF0F5" }]} />;
}

interface Props {
  data: AdminDashboardData | undefined;
  isLoading: boolean;
}

export function KpiGrid({ data, isLoading }: Props) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 32 - 10) / 2;
  const t = useT();
  const d = t.adminDashboard;

  if (isLoading) {
    return (
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} cardWidth={cardWidth} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      <KpiCard
        label={d.kpiActiveClinics}
        value={data?.clinics.active ?? 0}
        icon="business-outline"
        color={T.success}
        sub={d.kpiRunning}
        cardWidth={cardWidth}
        onPress={() => goToClinics({ status: "ACTIVE" })}
      />
      <KpiCard
        label={d.statusSuspended}
        value={data?.clinics.suspended ?? 0}
        icon="ban-outline"
        color={T.danger}
        sub={d.kpiClinics}
        cardWidth={cardWidth}
        onPress={() => goToClinics({ status: "SUSPENDED" })}
      />
      <KpiCard
        label={d.statusPending}
        value={data?.invoices.pending ?? 0}
        icon="time-outline"
        color={T.warning}
        sub={d.kpiInvoices}
        cardWidth={cardWidth}
        onPress={() => goToInvoices({ status: "PENDING" })}
      />
      <KpiCard
        label={d.statusUnpaid}
        value={data?.invoices.unpaid ?? 0}
        icon="alert-circle-outline"
        color={T.danger}
        sub={d.kpiInvoices}
        cardWidth={cardWidth}
        onPress={() => goToInvoices({ status: "UNPAID" })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    gap: 5,
    minHeight: 100,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: T.r10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  value: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 26, lineHeight: 30 },
  label: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 13, color: T.text },
  sub: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 11, color: T.textMuted, marginTop: -2 },
});
