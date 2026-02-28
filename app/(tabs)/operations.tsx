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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StatusBadge } from "@/components/StatusBadge";

interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  type: string;
  date: string;
  time: string;
  status: string;
  clinicName: string;
}

interface Transport {
  id: string;
  patientName: string;
  driverName: string;
  driverPhone: string;
  from: string;
  to: string;
  date: string;
  time: string;
  status: string;
  vehicleType: string;
}

type Tab = "appointments" | "transport";

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
  apt: Appointment;
  colors: typeof Colors.light;
}) {
  return (
    <SectionCard colors={colors}>
      <View style={styles.aptRow}>
        <View style={[styles.aptTimePill, { backgroundColor: colors.accent + "15" }]}>
          <Text style={[styles.aptTime, { color: colors.accent, fontFamily: "Inter_700Bold" }]}>
            {apt.time}
          </Text>
          <Text style={[styles.aptDate, { color: colors.accent + "CC", fontFamily: "Inter_400Regular" }]}>
            {new Date(apt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </Text>
        </View>
        <View style={styles.aptDetails}>
          <Text style={[styles.aptPatient, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
            {apt.patientName}
          </Text>
          <Text style={[styles.aptType, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {apt.type}
          </Text>
          <View style={styles.aptDoctor}>
            <Ionicons name="person-circle-outline" size={13} color={colors.textMuted} />
            <Text style={[styles.aptDoctorText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
              {apt.doctorName}
            </Text>
          </View>
          <View style={styles.aptClinic}>
            <Ionicons name="business-outline" size={13} color={colors.textMuted} />
            <Text style={[styles.aptClinicText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
              {apt.clinicName}
            </Text>
          </View>
        </View>
        <StatusBadge status={apt.status as any} small />
      </View>
    </SectionCard>
  );
}

function TransportRow({
  transport,
  colors,
}: {
  transport: Transport;
  colors: typeof Colors.light;
}) {
  return (
    <SectionCard colors={colors}>
      <View style={styles.trnHeader}>
        <View style={styles.trnPatientWrap}>
          <Text style={[styles.trnPatient, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
            {transport.patientName}
          </Text>
          <Text style={[styles.trnVehicle, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {transport.vehicleType}
          </Text>
        </View>
        <StatusBadge status={transport.status as any} small />
      </View>

      <View style={styles.trnRoute}>
        <View style={styles.trnPoint}>
          <View style={[styles.trnDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.trnLocation, { color: colors.text, fontFamily: "Inter_400Regular" }]}>
            {transport.from}
          </Text>
        </View>
        <View style={[styles.trnLine, { backgroundColor: colors.border }]} />
        <View style={styles.trnPoint}>
          <View style={[styles.trnDot, { backgroundColor: colors.error }]} />
          <Text style={[styles.trnLocation, { color: colors.text, fontFamily: "Inter_400Regular" }]}>
            {transport.to}
          </Text>
        </View>
      </View>

      <View style={[styles.trnDriver, { backgroundColor: colors.background, borderRadius: 10 }]}>
        <Ionicons name="person-circle-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.trnDriverName, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
          {transport.driverName}
        </Text>
        <View style={styles.flex1} />
        <Ionicons name="call-outline" size={14} color={colors.accent} />
        <Text style={[styles.trnPhone, { color: colors.accent, fontFamily: "Inter_400Regular" }]}>
          {transport.driverPhone}
        </Text>
      </View>

      <View style={styles.trnTime}>
        <Ionicons name="time-outline" size={13} color={colors.textMuted} />
        <Text style={[styles.trnTimeText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
          {new Date(transport.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {transport.time}
        </Text>
      </View>
    </SectionCard>
  );
}

export default function OperationsScreen() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>("appointments");

  const { data: appointments, refetch: refetchApts, isRefetching: aRefetch } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: transports, refetch: refetchTrn, isRefetching: tRefetch } = useQuery<Transport[]>({
    queryKey: ["/api/transports"],
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const isRefetching = aRefetch || tRefetch;
  const refetch = () => { refetchApts(); refetchTrn(); };

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
        <Text style={[styles.screenTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
          Operations
        </Text>

        <View style={[styles.tabRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(["appointments", "transport"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setActiveTab(t)}
              style={[
                styles.tabBtn,
                activeTab === t && { backgroundColor: colors.accent },
              ]}
            >
              <Ionicons
                name={t === "appointments" ? "calendar-outline" : "car-outline"}
                size={14}
                color={activeTab === t ? "#fff" : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === t ? "#fff" : colors.textSecondary,
                    fontFamily: "Inter_500Medium",
                  },
                ]}
              >
                {t === "appointments" ? "Appointments" : "Transport"}
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
        {activeTab === "appointments" &&
          (appointments ?? []).map((apt) => (
            <AppointmentRow key={apt.id} apt={apt} colors={colors} />
          ))}
        {activeTab === "transport" &&
          (transports ?? []).map((t) => (
            <TransportRow key={t.id} transport={t} colors={colors} />
          ))}
        {activeTab === "appointments" && (appointments ?? []).length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
              No appointments found
            </Text>
          </View>
        )}
        {activeTab === "transport" && (transports ?? []).length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
              No transports scheduled
            </Text>
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
});
