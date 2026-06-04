import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StatusBadge } from "@/components/StatusBadge";
import { getDisplayTerms } from "@/constants/terminology";

interface UpcomingAppointment {
  id: string;
  patient: { fullName: string };
  doctor?: { name: string } | null;
  type: string;
  startAt: string;
  status: string;
}

type Tab = "appointments" | "resources";

function SectionCard({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: typeof Colors.light;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

function AppointmentRow({
  apt,
  colors,
}: {
  apt: UpcomingAppointment;
  colors: typeof Colors.light;
}) {
  const dateObj = new Date(apt.startAt);
  const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = dateObj.toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <SectionCard colors={colors}>
      <View style={styles.aptRow}>
        <View style={[styles.aptTimePill, { backgroundColor: colors.accent + "15" }]}>
          <Text style={[styles.aptTime, { color: colors.accent, fontFamily: "PlusJakartaSans_700Bold" }]}>
            {timeStr}
          </Text>
          <Text style={[styles.aptDate, { color: colors.accent + "CC", fontFamily: "PlusJakartaSans_400Regular" }]}>
            {dateStr}
          </Text>
        </View>
        <View style={styles.aptDetails}>
          <Text style={[styles.aptPatient, { color: colors.text, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
            {apt.patient.fullName}
          </Text>
          <Text style={[styles.aptType, { color: colors.textSecondary, fontFamily: "PlusJakartaSans_400Regular" }]}>
            {apt.type}
          </Text>
          {apt.doctor && (
            <View style={styles.aptDoctor}>
              <Ionicons name="person-circle-outline" size={13} color={colors.textMuted} />
              <Text style={[styles.aptDoctorText, { color: colors.textMuted, fontFamily: "PlusJakartaSans_400Regular" }]}>
                {apt.doctor.name}
              </Text>
            </View>
          )}
        </View>
        <StatusBadge status={apt.status as any} small />
      </View>
    </SectionCard>
  );
}

function ResourceCard({
  title,
  icon,
  route,
  colors,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  colors: typeof Colors.light;
}) {
  return (
    <Pressable
      onPress={() => router.push(route as any)}
      style={({ pressed }) => [
        styles.resourceCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.resourceIcon, { backgroundColor: colors.accent + "10" }]}>
        <Ionicons name={icon} size={24} color={colors.accent} />
      </View>
      <Text style={[styles.resourceTitle, { color: colors.text, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
        {title}
      </Text>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

export default function OperationsScreen() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>("appointments");

  const { data: appointments, refetch, isRefetching } = useQuery<UpcomingAppointment[]>({
    queryKey: ["/v1/manager/upcoming-appointments"],
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: colors.background,
            paddingTop: topPad + 8,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.screenTitle, { color: colors.text, fontFamily: "PlusJakartaSans_700Bold" }]}>
          Operations
        </Text>

        <View style={[styles.tabRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(["appointments", "resources"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setActiveTab(t)}
              style={[
                styles.tabBtn,
                activeTab === t && { backgroundColor: colors.accent },
              ]}
            >
              <Ionicons
                name={t === "appointments" ? "calendar-outline" : "business-outline"}
                size={14}
                color={activeTab === t ? "#fff" : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === t ? "#fff" : colors.textSecondary,
                    fontFamily: "PlusJakartaSans_500Medium",
                  },
                ]}
              >
                {t === "appointments" ? getDisplayTerms().appointments : "Resources"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 120 }]}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "appointments" && (
          <>
            {(appointments ?? []).map((apt) => (
              <AppointmentRow key={apt.id} apt={apt} colors={colors} />
            ))}
            {(appointments ?? []).length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: "PlusJakartaSans_400Regular" }]}>
                  {`No upcoming ${getDisplayTerms().appointments.toLowerCase()}`}
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === "resources" && (
          <View style={styles.resourcesGrid}>
            <ResourceCard
              title={getDisplayTerms().doctors}
              icon="person-outline"
              route="/(manager)/doctors"
              colors={colors}
            />
            <ResourceCard
              title="Hotels"
              icon="bed-outline"
              route="/(manager)/hotels"
              colors={colors}
            />
            <ResourceCard
              title="Transports"
              icon="car-outline"
              route="/(manager)/transports"
              colors={colors}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex1: { flex: 1 },
  headerBar: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  screenTitle: { fontSize: 28 },
  tabRow: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabText: { fontSize: 13 },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  aptRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  aptTimePill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    minWidth: 54,
  },
  aptTime: { fontSize: 15 },
  aptDate: { fontSize: 11, marginTop: 1 },
  aptDetails: { flex: 1, gap: 3 },
  aptPatient: { fontSize: 15 },
  aptType: { fontSize: 13 },
  aptDoctor: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  aptDoctorText: { fontSize: 12 },
  aptClinic: { flexDirection: "row", alignItems: "center", gap: 4 },
  aptClinicText: { fontSize: 12 },
  trnHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  trnPatientWrap: { gap: 2 },
  trnPatient: { fontSize: 16 },
  trnVehicle: { fontSize: 12 },
  trnRoute: {
    gap: 6,
    paddingLeft: 4,
  },
  trnPoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trnDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  trnLine: {
    height: 1,
    marginLeft: 4,
    flex: 1,
    maxHeight: 1,
    marginVertical: -4,
    alignSelf: "stretch",
  },
  trnLocation: { fontSize: 14, flex: 1 },
  trnDriver: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
  },
  trnDriverName: { fontSize: 14 },
  trnPhone: { fontSize: 13 },
  trnTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  trnTimeText: { fontSize: 12 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyText: { fontSize: 15 },
  resourcesGrid: {
    gap: 12,
  },
  resourceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  resourceTitle: {
    flex: 1,
    fontSize: 16,
  },
});
