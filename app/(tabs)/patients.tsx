import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  useColorScheme,
  Platform,
  TextInput,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StatusBadge } from "@/components/StatusBadge";

interface Patient {
  id: string;
  name: string;
  clinicId: string;
  clinicName: string;
  status: string;
  procedure: string;
  arrivalDate: string;
  assignedDoctor: string;
  patientKey: string;
  createdAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PatientCard({
  patient,
  colors,
}: {
  patient: Patient;
  colors: typeof Colors.light;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      style={({ pressed }) => [
        styles.patientCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: colors.accent + "20" },
          ]}
        >
          <Text style={[styles.avatarText, { color: colors.accent, fontFamily: "Inter_700Bold" }]}>
            {patient.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.patientName, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
            {patient.name}
          </Text>
          <Text style={[styles.patientProcedure, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {patient.procedure}
          </Text>
          <Text style={[styles.patientKey, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
            {patient.patientKey}
          </Text>
        </View>
        <StatusBadge status={patient.status as any} small />
      </View>

      {expanded && (
        <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
          <DetailRow label="Clinic" value={patient.clinicName} colors={colors} />
          <DetailRow label="Doctor" value={patient.assignedDoctor} colors={colors} />
          <DetailRow label="Arrival" value={formatDate(patient.arrivalDate)} colors={colors} />
          <DetailRow label="Registered" value={formatDate(patient.createdAt)} colors={colors} />
        </View>
      )}

      <View style={styles.cardChevron}>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={colors.textMuted}
        />
      </View>
    </Pressable>
  );
}

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
        {value}
      </Text>
    </View>
  );
}

export default function PatientsScreen() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "PENDING" | "INACTIVE">("ALL");

  const { data: patients, isLoading, refetch, isRefetching } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const filtered = (patients ?? []).filter((p) => {
    const matchSearch =
      search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.procedure.toLowerCase().includes(search.toLowerCase()) ||
      p.patientKey.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "ALL" || p.status === filter;
    return matchSearch && matchFilter;
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
        <Text style={[styles.screenTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
          Patients
        </Text>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text, fontFamily: "Inter_400Regular" }]}
            placeholder="Search patients..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <View style={styles.filterRow}>
          {(["ALL", "ACTIVE", "PENDING", "INACTIVE"] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterBtn,
                {
                  backgroundColor:
                    filter === f ? colors.accent : colors.card,
                  borderColor: filter === f ? colors.accent : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color: filter === f ? "#fff" : colors.textSecondary,
                    fontFamily: "Inter_500Medium",
                  },
                ]}
              >
                {f}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <Ionicons name="hourglass-outline" size={32} color={colors.textMuted} />
          <Text style={[styles.stateText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
            Loading patients...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomPad + 120 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.accent}
            />
          }
          scrollEnabled={!!filtered.length}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Ionicons name="people-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.stateText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
                No patients found
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <PatientCard patient={item} colors={colors} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBar: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  screenTitle: {
    fontSize: 28,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  patientCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 0,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  patientName: {
    fontSize: 16,
  },
  patientProcedure: {
    fontSize: 13,
  },
  patientKey: {
    fontSize: 11,
    marginTop: 2,
  },
  cardChevron: {
    alignItems: "center",
    marginTop: 6,
  },
  expandedSection: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingTop: 60,
  },
  stateText: {
    fontSize: 15,
  },
});
