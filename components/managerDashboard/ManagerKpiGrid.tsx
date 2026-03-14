import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import type { ManagerDashboardData } from "@/hooks/useManagerDashboard";

interface KpiCardProps {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  subtitle: string;
  onPress?: () => void;
}

function KpiCard({ label, value, icon, color, subtitle, onPress }: KpiCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        cardShadow,
        { opacity: pressed ? 0.82 : 1 },
      ]}
      onPress={onPress}
      testID={`kpi-${label}`}
    >
      <View style={[styles.iconWrap, { backgroundColor: color + "14" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.sub}>{subtitle}</Text>
    </Pressable>
  );
}

function KpiSkeleton() {
  return (
    <View style={[styles.card, styles.skeleton]}>
      <ActivityIndicator size="small" color={T.border} />
    </View>
  );
}

interface Props {
  data: ManagerDashboardData;
  isLoading: boolean;
}

export function ManagerKpiGrid({ data, isLoading }: Props) {
  const { kpis } = data;

  if (isLoading) {
    return (
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <KpiSkeleton key={i} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      <KpiCard
        label="Active Guests"
        value={kpis.activeGuests}
        icon="people-outline"
        color={T.primary}
        subtitle="approved / in progress"
        onPress={() => router.push("/(manager-tabs)/users")}
      />
      <KpiCard
        label="Appts Today"
        value={kpis.appointmentsToday}
        icon="calendar-outline"
        color={T.accent}
        subtitle="scheduled"
        onPress={() => router.push("/(manager-tabs)/users")}
      />
      <KpiCard
        label="Pending Docs"
        value={kpis.pendingDocuments}
        icon="document-outline"
        color={T.warning}
        subtitle="awaiting upload"
        onPress={() => router.push("/(manager-tabs)/users")}
      />
      <KpiCard
        label="Missing Plans"
        value={kpis.missingAssignments}
        icon="alert-circle-outline"
        color={T.danger}
        subtitle="hotel / transport / doctor"
        onPress={() => router.push("/(manager-tabs)/users")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    flex: 1,
    minWidth: "45%" as any,
    backgroundColor: T.surface,
    borderRadius: T.r12,
    padding: T.sp16,
    gap: 3,
    borderWidth: 1,
    borderColor: T.border,
  },
  skeleton: {
    height: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: T.r8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: T.sp8,
  },
  value: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: T.text,
    letterSpacing: -0.5,
  },
  label: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 12,
    color: T.text,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: T.textMuted,
  },
});
