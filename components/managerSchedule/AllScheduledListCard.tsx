import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { format, parseISO } from "date-fns";
import { T, cardShadow } from "@/constants/adminTheme";
import { StatusPill, Divider } from "@/components/ui";
import type { DayGroup, ScheduleFilter } from "@/hooks/useScheduleDerivedData";
import type { ScheduleAppt } from "@/hooks/useManagerMonthAppointments";

const FILTERS: { label: string; value: ScheduleFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Upcoming", value: "UPCOMING" },
  { label: "Completed", value: "DONE" },
  { label: "Missed", value: "MISSED" },
  { label: "Cancelled", value: "CANCELLED" },
];

interface RowProps {
  appt: ScheduleAppt;
}

function ApptRow({ appt }: RowProps) {
  const time = format(parseISO(appt.startAt), "HH:mm");
  return (
    <Pressable
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.78 : 1 }]}
      onPress={() => {
        if (appt.patientId) {
          router.push({
            pathname: "/(manager)/patients/[id]",
            params: { id: appt.patientId },
          });
        }
      }}
    >
      <View style={styles.timeBox}>
        <Text style={styles.timeText}>{time}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.patient} numberOfLines={1}>
          {appt.patientName}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {appt.title}
          {appt.doctorName ? ` · ${appt.doctorName}` : ""}
        </Text>
      </View>
      <StatusPill status={appt.status} />
    </Pressable>
  );
}

function GroupHeader({ label }: { label: string }) {
  return (
    <View style={styles.groupHeader}>
      <Text style={styles.groupLabel}>{label}</Text>
    </View>
  );
}

interface Props {
  groups: DayGroup[];
  isLoading: boolean;
  filter: ScheduleFilter;
  onFilterChange: (f: ScheduleFilter) => void;
}

export function AllScheduledListCard({
  groups,
  isLoading,
  filter,
  onFilterChange,
}: Props) {
  return (
    <View style={[styles.card, cardShadow]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.dot, { backgroundColor: "#6366F1" }]} />
          <Text style={styles.headerTitle}>All Scheduled</Text>
        </View>
        {groups.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {groups.reduce((s, g) => s + g.appts.length, 0)}
            </Text>
          </View>
        )}
      </View>

      {/* Filter chips — horizontal scroll for all 5 options */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.value}
            style={[styles.chip, filter === f.value && styles.chipActive]}
            onPress={() => onFilterChange(f.value)}
          >
            <Text style={[styles.chipText, filter === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={T.accent} />
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="layers-outline" size={22} color={T.border} />
          <Text style={styles.emptyText}>No appointments found.</Text>
        </View>
      ) : (
        groups.map((group, gi) => (
          <View key={group.dateKey}>
            {gi > 0 && <View style={styles.groupDivider} />}
            <GroupHeader label={group.dateLabel} />
            {group.appts.map((appt, ai) => (
              <React.Fragment key={appt.id}>
                {ai > 0 && <Divider inset={64} />}
                <ApptRow appt={appt} />
              </React.Fragment>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r12,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: T.surfaceSubtle,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 14,
    color: T.text,
  },
  countBadge: {
    backgroundColor: "#6366F114",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#6366F130",
  },
  countText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#6366F1",
  },
  filterScroll: {
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
  },
  chip: {
    paddingHorizontal: T.sp12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surfaceSubtle,
  },
  chipActive: {
    backgroundColor: T.accent,
    borderColor: T.accent,
  },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: T.textMuted,
  },
  chipTextActive: {
    color: "#fff",
  },
  center: {
    padding: T.sp24,
    alignItems: "center",
  },
  empty: {
    padding: T.sp20,
    alignItems: "center",
    gap: T.sp8,
    flexDirection: "row",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textMuted,
  },
  groupHeader: {
    paddingHorizontal: T.sp16,
    paddingTop: T.sp12,
    paddingBottom: T.sp4,
  },
  groupLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  groupDivider: {
    height: 1,
    backgroundColor: T.border,
    marginTop: T.sp8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
    gap: T.sp12,
  },
  timeBox: {
    width: 44,
    height: 34,
    borderRadius: T.r8,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
    flexShrink: 0,
  },
  timeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: T.accent,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  patient: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 13,
    color: T.text,
  },
  title: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
});
