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
  highlight?: boolean;
  onPress?: () => void;
}

function KpiCard({
  label,
  value,
  icon,
  color,
  subtitle,
  highlight,
  onPress,
}: KpiCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        cardShadow,
        highlight && styles.cardHighlight,
        { opacity: pressed ? 0.82 : 1 },
      ]}
      onPress={onPress}
      testID={`kpi-${label}`}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: highlight ? color + "22" : color + "14" },
        ]}
      >
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.sub}>{subtitle}</Text>
      {highlight && (
        <View style={[styles.badge, { backgroundColor: color + "18" }]}>
          <Ionicons name="chevron-forward" size={10} color={color} />
          <Text style={[styles.badgeText, { color }]}>View</Text>
        </View>
      )}
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
  onAppointmentsTodayPress: () => void;
}

export function ManagerKpiGrid({ data, isLoading, onAppointmentsTodayPress }: Props) {
  const { kpis, upcomingNext7Days, arrivingThisMonth } = data;

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
        subtitle="tap to view list"
        highlight
        onPress={onAppointmentsTodayPress}
      />
      <KpiCard
        label="Arrivals This Month"
        value={arrivingThisMonth}
        icon="airplane-outline"
        color="#6366F1"
        subtitle="patients arriving"
        onPress={() => router.push("/(manager-tabs)/users")}
      />
      <KpiCard
        label="Upcoming 7 Days"
        value={upcomingNext7Days}
        icon="time-outline"
        color="#2ECF8F"
        subtitle="scheduled appointments"
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
  cardHighlight: {
    borderColor: T.accent + "40",
    backgroundColor: T.accent + "05",
  },
  skeleton: {
    height: 120,
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
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 4,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 10,
  },
});
