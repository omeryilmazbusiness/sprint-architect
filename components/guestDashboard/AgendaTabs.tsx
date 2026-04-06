import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import { useT } from "@/hooks/useT";
import { useLanguage } from "@/context/LanguageContext";
import type { PatientAppointment } from "@/hooks/guest/useGuestDashboard";

type Tab = "today" | "upcoming" | "completed";

interface Props {
  todayList: PatientAppointment[];
  upcomingList: PatientAppointment[];
  completedList: PatientAppointment[];
}

function ApptItem({ appt }: { appt: PatientAppointment }) {
  const t = useT();
  const tg = t.guestDashboard;
  const { locale } = useLanguage();

  const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
    SCHEDULED: { label: tg.agendaStatusScheduled, bg: T.successBg, text: T.success },
    DONE: { label: tg.agendaStatusDone, bg: T.inactiveBg, text: T.inactiveText },
    CANCELLED: { label: tg.agendaStatusCancelled, bg: T.dangerBg, text: T.danger },
  };

  const cfg = STATUS_CFG[appt.status] ?? STATUS_CFG.SCHEDULED;
  const l = locale === "ru" ? "ru-RU" : "en-US";
  const start = new Date(appt.startAt);
  const dateLabel = start.toLocaleDateString(l, { day: "numeric", month: "short" });
  const timeLabel = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <View style={styles.item}>
      <View style={styles.timeBadge}>
        <Text style={styles.dateLabel}>{dateLabel}</Text>
        <Text style={styles.timeLabel}>{timeLabel}</Text>
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.itemTitle} numberOfLines={1}>{appt.title}</Text>
        {appt.doctor?.fullName ? (
          <Text style={styles.itemSub} numberOfLines={1}>{tg.drPrefix}{appt.doctor.fullName}</Text>
        ) : null}
      </View>
      <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
      </View>
    </View>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <View style={styles.emptyBox}>
      <Ionicons name="calendar-outline" size={28} color={T.textMuted} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export function AgendaTabs({ todayList, upcomingList, completedList }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const t = useT();
  const tg = t.guestDashboard;

  const TABS: { key: Tab; label: string }[] = [
    { key: "today", label: tg.agendaTabToday },
    { key: "upcoming", label: tg.agendaTabUpcoming },
    { key: "completed", label: tg.agendaTabCompleted },
  ];

  const list =
    activeTab === "today" ? todayList : activeTab === "upcoming" ? upcomingList : completedList;

  const emptyMsg =
    activeTab === "today"
      ? tg.agendaEmptyToday
      : activeTab === "upcoming"
      ? tg.agendaEmptyUpcoming
      : tg.agendaEmptyCompleted;

  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {list.length === 0 ? (
        <EmptyTab message={emptyMsg} />
      ) : (
        list.map((a) => <ApptItem key={a.id} appt={a} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
    marginBottom: T.sp12,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: T.surfaceSubtle,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: T.accent,
    backgroundColor: T.surface,
  },
  tabText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.textSec,
  },
  tabTextActive: {
    fontFamily: "Inter_700Bold",
    color: T.accent,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    gap: T.sp12,
  },
  timeBadge: {
    alignItems: "center",
    backgroundColor: T.surfaceSubtle,
    borderRadius: T.r8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    minWidth: 54,
  },
  dateLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: T.accent,
  },
  timeLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: T.text,
    marginTop: 1,
  },
  itemBody: { flex: 1 },
  itemTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: T.text,
  },
  itemSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textSec,
    marginTop: 2,
  },
  statusPill: {
    borderRadius: T.r20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: T.sp24,
    gap: 8,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.textMuted,
  },
});
