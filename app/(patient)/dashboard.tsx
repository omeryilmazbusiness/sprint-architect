import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  useColorScheme,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingView } from "@/components/LoadingView";
import { ErrorView } from "@/components/ErrorView";
import { EmptyState } from "@/components/EmptyState";

interface PatientDashboardData {
  patient: {
    id: string;
    fullName: string;
    patientKey: string;
    status: string;
  };
  appointments: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    startAt: string;
  }>;
  documents: Array<{
    id: string;
    status: string;
    documentType: {
      name: string;
    };
  }>;
  doctors: Array<{
    id: string;
    name: string;
    specialty: string;
  }>;
  plan: {
    doctor?: {
      name: string;
      specialty: string;
    };
    hotel?: {
      name: string;
      address: string;
    };
  };
}

export default function PatientDashboard() {
  const { logout, user } = useAuth();
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<PatientDashboardData>({
    queryKey: ["/v1/patient/dashboard"],
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) return <LoadingView />;
  if (isError || !data) return <ErrorView onRetry={refetch} />;

  const { patient, appointments, documents, plan } = data;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
        }
      >
        <LinearGradient
          colors={[colors.primary, isDark ? "#00B4D8" : "#1A5276"]}
          style={[styles.hero, { paddingTop: topPad + 20 }]}
        >
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroName}>{patient.fullName}</Text>
              <View style={styles.heroRow}>
                <StatusBadge status={patient.status as any} small />
                <Text style={styles.heroKey}>ID: {patient.patientKey}</Text>
              </View>
            </View>
            <Pressable onPress={logout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={24} color="#fff" />
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>My Appointments</Text>
          {appointments.length === 0 ? (
            <EmptyState title="No upcoming appointments" icon="calendar-outline" />
          ) : (
            appointments.map((apt) => (
              <View key={apt.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardMain}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{apt.title}</Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                    {apt.type} · {new Date(apt.startAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </Text>
                </View>
                <StatusBadge status={apt.status as any} small />
              </View>
            ))
          )}

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>My Documents</Text>
          {documents.length === 0 ? (
            <EmptyState title="No documents found" />
          ) : (
            documents.map((doc) => (
              <View key={doc.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardMain}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{doc.documentType.name}</Text>
                </View>
                <StatusBadge status={doc.status as any} small />
              </View>
            ))
          )}

          {plan.doctor && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>My Care Team</Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="person-circle-outline" size={40} color={colors.accent} />
                <View style={styles.cardMain}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{plan.doctor.name}</Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{plan.doctor.specialty}</Text>
                </View>
              </View>
            </>
          )}

          {plan.hotel && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>My Hotel</Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="bed-outline" size={40} color={colors.accent} />
                <View style={styles.cardMain}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{plan.hotel.name}</Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{plan.hotel.address}</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  heroKey: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  logoutBtn: {
    padding: 8,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  cardMain: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  cardSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
