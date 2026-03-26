import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Animated,
  LayoutChangeEvent,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GuestHeader } from "@/components/guest/GuestHeader";
import { useGuestAppointmentsBuckets, BucketKey } from "@/hooks/guest/useGuestAppointmentsBuckets";
import type { PatientAppointment } from "@/hooks/guest/useGuestDashboard";
import { T, cardShadow } from "@/constants/adminTheme";

// ─── Status display config ────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; tc: string; icon: string }> = {
  SCHEDULED: { label: "Scheduled",  bg: "#EFF6FF",   tc: T.accent,   icon: "time-outline" },
  DONE:      { label: "Completed",  bg: T.successBg, tc: T.success,  icon: "checkmark-circle-outline" },
  CANCELLED: { label: "Cancelled",  bg: T.dangerBg,  tc: T.danger,   icon: "close-circle-outline" },
  MISSED:    { label: "Missed",     bg: "#FEF3C7",   tc: "#D97706",  icon: "alert-circle-outline" },
};

const BUCKET_TABS: { key: BucketKey; label: string; icon: string }[] = [
  { key: "today",     label: "Today",     icon: "today-outline" },
  { key: "upcoming",  label: "Upcoming",  icon: "calendar-outline" },
  { key: "completed", label: "Completed", icon: "checkmark-circle-outline" },
  { key: "missed",    label: "Missed",    icon: "alert-circle-outline" },
  { key: "cancelled", label: "Cancelled", icon: "close-circle-outline" },
];

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return {
      dayNum: d.getDate(),
      month:  d.toLocaleDateString("en-US", { month: "short" }),
      weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
      time:   d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      full:   d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" }),
      iso: d.toISOString().split("T")[0],
    };
  } catch {
    return { dayNum: 0, month: "", weekday: "", time: "", full: iso, iso: iso.slice(0, 10) };
  }
}

// ─── Appointment Card ─────────────────────────────────────────────────────────

function ApptCard({ appt, bucketKey }: { appt: PatientAppointment; bucketKey: BucketKey }) {
  const { dayNum, month, weekday, time } = fmtDate(appt.startAt);
  const displayStatus = bucketKey === "missed" ? "MISSED" : appt.status;
  const cfg = STATUS_CFG[displayStatus] ?? STATUS_CFG.SCHEDULED;
  const doctorName = appt.doctor?.fullName ?? null;

  return (
    <View style={[c.card, cardShadow]}>
      {/* Date badge */}
      <View style={c.dateBadge}>
        <Text style={c.badgeDay}>{dayNum}</Text>
        <Text style={c.badgeMon}>{month}</Text>
        <Text style={c.badgeWd}>{weekday}</Text>
      </View>

      {/* Content */}
      <View style={c.body}>
        <Text style={c.title} numberOfLines={2}>{appt.title}</Text>
        <View style={c.metaRow}>
          <Ionicons name="time-outline" size={12} color={T.textMuted} />
          <Text style={c.metaTxt}>{time}</Text>
          {doctorName ? (
            <>
              <Text style={c.metaDot}>·</Text>
              <Ionicons name="person-outline" size={12} color={T.textMuted} />
              <Text style={c.metaTxt} numberOfLines={1}>Dr. {doctorName}</Text>
            </>
          ) : null}
        </View>
        {appt.locationText ? (
          <View style={c.metaRow}>
            <Ionicons name="location-outline" size={12} color={T.textMuted} />
            <Text style={c.metaTxt} numberOfLines={1}>{appt.locationText}</Text>
          </View>
        ) : null}
        <View style={[c.pill, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={11} color={cfg.tc} />
          <Text style={[c.pillTxt, { color: cfg.tc }]}>{cfg.label}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

const EMPTY_CFG: Record<BucketKey, { icon: string; title: string; sub: string }> = {
  today:     { icon: "today-outline",             title: "No appointments today",    sub: "Enjoy your day!" },
  upcoming:  { icon: "calendar-outline",          title: "No upcoming appointments", sub: "Your clinic will schedule them soon." },
  completed: { icon: "checkmark-circle-outline",  title: "No completed appointments", sub: "Completed visits will appear here." },
  missed:    { icon: "alert-circle-outline",      title: "No missed appointments",   sub: "Great — nothing missed!" },
  cancelled: { icon: "close-circle-outline",      title: "No cancelled appointments", sub: "All clear." },
};

function EmptyBucket({ bucket }: { bucket: BucketKey }) {
  const cfg = EMPTY_CFG[bucket];
  return (
    <View style={e.wrap}>
      <View style={e.iconWrap}>
        <Ionicons name={cfg.icon as any} size={36} color={T.textMuted} />
      </View>
      <Text style={e.title}>{cfg.title}</Text>
      <Text style={e.sub}>{cfg.sub}</Text>
    </View>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function TabBar({
  active,
  counts,
  onChange,
}: {
  active: BucketKey;
  counts: Record<BucketKey, number>;
  onChange: (k: BucketKey) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tb.row}
      style={tb.scroll}
    >
      {BUCKET_TABS.map((tab) => {
        const isActive = tab.key === active;
        const count    = counts[tab.key];
        return (
          <Pressable
            key={tab.key}
            style={[tb.chip, isActive ? tb.chipActive : tb.chipInactive]}
            onPress={() => onChange(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={14}
              color={isActive ? "#fff" : T.textSec}
            />
            <Text style={[tb.chipLabel, { color: isActive ? "#fff" : T.textSec }]}>
              {tab.label}
            </Text>
            {count > 0 ? (
              <View style={[tb.badge, { backgroundColor: isActive ? "rgba(255,255,255,0.3)" : T.accent }]}>
                <Text style={tb.badgeTxt}>{count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets       = useSafeAreaInsets();
  const [active, setActive] = useState<BucketKey>("upcoming");
  const [refreshing, setRefreshing] = useState(false);

  const { isLoading, isError, refetch, today, upcoming, completed, missed, cancelled, counts, next } =
    useGuestAppointmentsBuckets();

  const bucketData: Record<BucketKey, PatientAppointment[]> = {
    today, upcoming, completed, missed, cancelled,
  };
  const list = bucketData[active] ?? [];

  async function onRefresh() {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 800);
  }

  if (isLoading) {
    return (
      <View style={st.root}>
        <GuestHeader title="Schedule" />
        <View style={st.center}>
          <ActivityIndicator size="large" color={T.accent} />
          <Text style={st.centerTxt}>Loading…</Text>
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={st.root}>
        <GuestHeader title="Schedule" />
        <View style={st.center}>
          <Ionicons name="alert-circle-outline" size={48} color={T.danger} />
          <Text style={st.errTitle}>Couldn't load schedule</Text>
          <Pressable onPress={onRefresh} style={st.retryBtn}>
            <Text style={st.retryTxt}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const nextLabel = next ? fmtDate(next.startAt).full : null;

  return (
    <View style={st.root}>
      <GuestHeader
        title="Schedule"
        subtitle={nextLabel ? `Next: ${nextLabel}` : undefined}
      />

      {/* Tab bar */}
      <View style={st.tabWrap}>
        <TabBar active={active} counts={counts} onChange={setActive} />
      </View>

      {/* List */}
      <FlatList
        data={list}
        keyExtractor={(a) => a.id}
        contentContainerStyle={[
          st.listContent,
          { paddingBottom: tabBarHeight + 24 },
          list.length === 0 ? st.listEmpty : null,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />
        }
        ListEmptyComponent={<EmptyBucket bucket={active} />}
        renderItem={({ item }) => <ApptCard appt={item} bucketKey={active} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const c = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  dateBadge: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.accent,
    paddingVertical: 14,
    gap: 2,
  },
  badgeDay: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff" },
  badgeMon: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "rgba(255,255,255,0.8)" },
  badgeWd:  { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.6)" },
  body: { flex: 1, padding: 14, gap: 5 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: T.text,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  metaTxt: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted },
  metaDot: { color: T.border, fontFamily: "Inter_700Bold" },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  pillTxt: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
});

const e = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, color: T.text },
  sub: {
    fontFamily: "Inter_400Regular", fontSize: 14, color: T.textMuted,
    textAlign: "center", lineHeight: 20,
  },
});

const tb = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { flexDirection: "row", gap: 8, paddingHorizontal: T.sp16, paddingVertical: 4 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 24,
  },
  chipActive:   { backgroundColor: T.accent },
  chipInactive: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  chipLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  badge: {
    borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: "center",
  },
  badgeTxt: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#fff" },
});

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  tabWrap: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border },
  listContent: { padding: T.sp16, gap: 0 },
  listEmpty: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  centerTxt: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textMuted },
  errTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: T.text },
  retryBtn: {
    backgroundColor: T.accent, borderRadius: T.r10,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  retryTxt: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
});
