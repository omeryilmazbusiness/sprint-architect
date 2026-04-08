import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import { useTabBarMetrics } from "@/components/layout/TabBarMetricsContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GuestHeader } from "@/components/guest/GuestHeader";
import {
  useGuestScheduleFilters,
  getEffectiveStatus,
  type StatusFilter,
  type RangeFilter,
  type ScheduleSection,
} from "@/hooks/guest/useGuestScheduleFilters";
import type { PatientAppointment } from "@/hooks/guest/useGuestDashboard";
import { T, cardShadow } from "@/constants/adminTheme";
import { useT } from "@/hooks/useT";
import { useLanguage } from "@/context/LanguageContext";

// ─── Format helpers ────────────────────────────────────────────────────────────

function fmtTime(iso: string, locale: string) {
  try {
    const l = locale === "ru" ? "ru-RU" : "en-US";
    return new Date(iso).toLocaleTimeString(l, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function fmtFull(iso: string, todayStr: string, tomorrowStr: string, locale: string) {
  try {
    const d = new Date(iso);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const t = new Date(d); t.setHours(0, 0, 0, 0);
    if (t.getTime() === today.getTime()) return todayStr;
    if (t.getTime() === tomorrow.getTime()) return tomorrowStr;
    const l = locale === "ru" ? "ru-RU" : "en-US";
    return d.toLocaleDateString(l, { weekday: "short", month: "short", day: "numeric" });
  } catch { return ""; }
}

function fmtMon(iso: string, locale: string) {
  const l = locale === "ru" ? "ru-RU" : "en-US";
  return new Date(iso).toLocaleDateString(l, { month: "short" });
}

// ─── Picker Modal ─────────────────────────────────────────────────────────────

interface PickerOption { key: string; label: string; icon?: string }
function PickerModal<T extends string>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: PickerOption[];
  value: T;
  onSelect: (v: T) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={pm.overlay} onPress={onClose}>
        <Pressable style={[pm.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={pm.handle} />
          <Text style={pm.title}>{title}</Text>
          {options.map((opt) => {
            const selected = opt.key === value;
            return (
              <Pressable
                key={opt.key}
                style={[pm.option, selected && pm.optionSelected]}
                onPress={() => onSelect(opt.key as T)}
              >
                {opt.icon ? (
                  <Ionicons
                    name={opt.icon as any}
                    size={17}
                    color={selected ? T.accent : T.textSec}
                  />
                ) : null}
                <Text style={[pm.optLabel, selected && pm.optLabelSelected]}>
                  {opt.label}
                </Text>
                {selected ? (
                  <Ionicons name="checkmark" size={16} color={T.accent} />
                ) : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Summary Section ──────────────────────────────────────────────────────────

function ScheduleSummary({
  next,
  counts,
}: {
  next: PatientAppointment | null;
  counts: Record<string, number>;
}) {
  const t = useT();
  const ts = t.guestSchedule;
  const { locale } = useLanguage();

  return (
    <View style={sum.wrap}>
      {next ? (
        <View style={[sum.nextCard, cardShadow]}>
          <View style={sum.nextLabel}>
            <Ionicons name="flash-outline" size={12} color={T.accent} />
            <Text style={sum.nextLabelText}>{ts.nextApptLabel}</Text>
          </View>
          <View style={sum.nextBody}>
            <View style={sum.nextDateBadge}>
              <Text style={sum.nextDateDay}>
                {new Date(next.startAt).getDate()}
              </Text>
              <Text style={sum.nextDateMon}>
                {fmtMon(next.startAt, locale)}
              </Text>
            </View>
            <View style={sum.nextInfo}>
              <Text style={sum.nextTitle} numberOfLines={2}>{next.title}</Text>
              <View style={sum.nextMeta}>
                <Ionicons name="time-outline" size={12} color={T.textMuted} />
                <Text style={sum.nextMetaTxt}>{fmtTime(next.startAt, locale)}</Text>
                {next.doctor?.fullName ? (
                  <>
                    <Text style={sum.dot}>·</Text>
                    <Text style={sum.nextMetaTxt} numberOfLines={1}>
                      {ts.drPrefix}{next.doctor.fullName}
                    </Text>
                  </>
                ) : null}
              </View>
              {next.locationText ? (
                <View style={sum.nextMeta}>
                  <Ionicons name="location-outline" size={12} color={T.textMuted} />
                  <Text style={sum.nextMetaTxt} numberOfLines={1}>{next.locationText}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ) : (
        <View style={[sum.nextCard, sum.nextCardEmpty, cardShadow]}>
          <Ionicons name="calendar-outline" size={22} color={T.textMuted} />
          <Text style={sum.noNextTxt}>{ts.noUpcoming}</Text>
        </View>
      )}

      <View style={sum.kpiRow}>
        <KpiCard icon="calendar-outline"      label={ts.kpiUpcoming}  value={counts.upcoming ?? 0}  color={T.accent} />
        <KpiCard icon="checkmark-circle-outline" label={ts.kpiCompleted} value={counts.completed ?? 0} color={T.success} />
        <KpiCard icon="alert-circle-outline"  label={ts.kpiMissed}    value={counts.missed ?? 0}    color="#D97706" />
      </View>
    </View>
  );
}

function KpiCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <View style={[kpi.card, cardShadow]}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[kpi.value, { color }]}>{value}</Text>
      <Text style={kpi.label}>{label}</Text>
    </View>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({
  search, onSearch,
  statusFilter, onOpenStatus,
  rangeFilter, onOpenRange,
  statusLabel, rangeLabel,
  hasActiveFilters, onClear,
}: {
  search: string;
  onSearch: (v: string) => void;
  statusFilter: StatusFilter;
  onOpenStatus: () => void;
  rangeFilter: RangeFilter;
  onOpenRange: () => void;
  statusLabel: string;
  rangeLabel: string;
  hasActiveFilters: boolean;
  onClear: () => void;
}) {
  const t = useT();
  const ts = t.guestSchedule;

  return (
    <View style={fb.wrap}>
      <View style={fb.searchRow}>
        <Ionicons name="search-outline" size={16} color={T.textMuted} style={fb.searchIcon} />
        <TextInput
          style={fb.searchInput}
          placeholder={ts.searchPlaceholder}
          placeholderTextColor={T.textMuted}
          value={search}
          onChangeText={onSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <View style={fb.dropRow}>
        <Pressable style={[fb.drop, statusFilter !== "all" && fb.dropActive]} onPress={onOpenStatus}>
          <Ionicons name="funnel-outline" size={13} color={statusFilter !== "all" ? T.accent : T.textSec} />
          <Text style={[fb.dropTxt, statusFilter !== "all" && fb.dropTxtActive]} numberOfLines={1}>
            {statusLabel}
          </Text>
          <Ionicons name="chevron-down" size={12} color={statusFilter !== "all" ? T.accent : T.textSec} />
        </Pressable>

        <Pressable style={[fb.drop, rangeFilter !== "all" && fb.dropActive]} onPress={onOpenRange}>
          <Ionicons name="calendar-outline" size={13} color={rangeFilter !== "all" ? T.accent : T.textSec} />
          <Text style={[fb.dropTxt, rangeFilter !== "all" && fb.dropTxtActive]} numberOfLines={1}>
            {rangeLabel}
          </Text>
          <Ionicons name="chevron-down" size={12} color={rangeFilter !== "all" ? T.accent : T.textSec} />
        </Pressable>

        {hasActiveFilters ? (
          <Pressable style={fb.clearBtn} onPress={onClear}>
            <Ionicons name="close-circle" size={14} color={T.danger} />
            <Text style={fb.clearTxt}>{ts.clearFilters}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────

function DateSectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={sh.row}>
      <View style={sh.line} />
      <Text style={sh.text}>{title}</Text>
      <View style={sh.badge}>
        <Text style={sh.badgeTxt}>{count}</Text>
      </View>
      <View style={sh.line} />
    </View>
  );
}

// ─── Appointment Card ──────────────────────────────────────────────────────────

function ApptCard({ appt }: { appt: PatientAppointment }) {
  const t = useT();
  const ts = t.guestSchedule;
  const { locale } = useLanguage();

  const STATUS_CFG: Record<
    "SCHEDULED" | "DONE" | "CANCELLED" | "MISSED",
    { label: string; bg: string; tc: string; icon: string }
  > = {
    SCHEDULED: { label: ts.statusScheduled,  bg: "#EFF6FF",   tc: T.accent,  icon: "time-outline" },
    DONE:      { label: ts.statusCompleted,  bg: T.successBg, tc: T.success, icon: "checkmark-circle-outline" },
    CANCELLED: { label: ts.statusCancelled,  bg: T.dangerBg,  tc: T.danger,  icon: "close-circle-outline" },
    MISSED:    { label: ts.statusMissed,     bg: "#FEF3C7",   tc: "#D97706", icon: "alert-circle-outline" },
  };

  const eff = getEffectiveStatus(appt);
  const cfg = STATUS_CFG[eff];
  const d = new Date(appt.startAt);
  const l = locale === "ru" ? "ru-RU" : "en-US";

  return (
    <View style={[ac.card, cardShadow]}>
      <View style={ac.dateBadge}>
        <Text style={ac.badgeDay}>{d.getDate()}</Text>
        <Text style={ac.badgeMon}>{d.toLocaleDateString(l, { month: "short" })}</Text>
        <Text style={ac.badgeWd}>{d.toLocaleDateString(l, { weekday: "short" })}</Text>
      </View>

      <View style={ac.body}>
        <Text style={ac.title} numberOfLines={2}>{appt.title}</Text>
        <View style={ac.metaRow}>
          <Ionicons name="time-outline" size={12} color={T.textMuted} />
          <Text style={ac.metaTxt}>{fmtTime(appt.startAt, locale)}</Text>
          {appt.doctor?.fullName ? (
            <>
              <Text style={ac.dot}>·</Text>
              <Ionicons name="person-outline" size={12} color={T.textMuted} />
              <Text style={ac.metaTxt} numberOfLines={1}>
                {ts.drPrefix}{appt.doctor.fullName}
              </Text>
            </>
          ) : null}
        </View>
        {appt.locationText ? (
          <View style={ac.metaRow}>
            <Ionicons name="location-outline" size={12} color={T.textMuted} />
            <Text style={ac.metaTxt} numberOfLines={1}>{appt.locationText}</Text>
          </View>
        ) : null}
        <View style={[ac.pill, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={11} color={cfg.tc} />
          <Text style={[ac.pillTxt, { color: cfg.tc }]}>{cfg.label}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyList({ hasFilters }: { hasFilters: boolean }) {
  const t = useT();
  const ts = t.guestSchedule;
  return (
    <View style={el.wrap}>
      <View style={el.iconWrap}>
        <Ionicons
          name={hasFilters ? "search-outline" : "calendar-outline"}
          size={36}
          color={T.textMuted}
        />
      </View>
      <Text style={el.title}>
        {hasFilters ? ts.emptyFiltered : ts.emptyClean}
      </Text>
      <Text style={el.sub}>
        {hasFilters ? ts.emptyFilteredSub : ts.emptyCleanSub}
      </Text>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const { bottomPadding: tabBarHeight } = useTabBarMetrics();
  const [refreshing, setRefreshing] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [rangeModalOpen, setRangeModalOpen] = useState(false);
  const t = useT();
  const ts = t.guestSchedule;
  const { locale } = useLanguage();

  const {
    statusFilter, setStatusFilter,
    rangeFilter, setRangeFilter,
    search, setSearch,
    sections,
    totalFiltered,
    isLoading, isError, refetch,
    next, counts,
  } = useGuestScheduleFilters();

  const hasActiveFilters = statusFilter !== "all" || rangeFilter !== "all" || search.trim() !== "";

  const STATUS_OPTIONS: { key: StatusFilter; label: string; icon: string }[] = [
    { key: "all",       label: ts.filterAll,       icon: "calendar-outline" },
    { key: "upcoming",  label: ts.filterUpcoming,  icon: "calendar-outline" },
    { key: "today",     label: ts.filterToday,     icon: "today-outline" },
    { key: "completed", label: ts.filterCompleted, icon: "checkmark-circle-outline" },
    { key: "missed",    label: ts.filterMissed,    icon: "alert-circle-outline" },
    { key: "cancelled", label: ts.filterCancelled, icon: "close-circle-outline" },
  ];

  const RANGE_OPTIONS: { key: RangeFilter; label: string }[] = [
    { key: "all",        label: ts.rangeAll },
    { key: "this_week",  label: ts.rangeThisWeek },
    { key: "this_month", label: ts.rangeThisMonth },
  ];

  const currentStatusLabel = STATUS_OPTIONS.find((o) => o.key === statusFilter)?.label ?? ts.filterAll;
  const currentRangeLabel  = RANGE_OPTIONS.find((o) => o.key === rangeFilter)?.label ?? ts.rangeAll;

  async function onRefresh() {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 800);
  }

  function clearFilters() {
    setStatusFilter("all");
    setRangeFilter("all");
    setSearch("");
  }

  if (isLoading) {
    return (
      <View style={st.root}>
        <GuestHeader title={ts.pageTitle} />
        <View style={st.center}>
          <ActivityIndicator size="large" color={T.accent} />
          <Text style={st.centerTxt}>{ts.loadingText}</Text>
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={st.root}>
        <GuestHeader title={ts.pageTitle} />
        <View style={st.center}>
          <Ionicons name="alert-circle-outline" size={48} color={T.danger} />
          <Text style={st.errTitle}>{ts.errTitle}</Text>
          <Pressable onPress={onRefresh} style={st.retryBtn}>
            <Text style={st.retryTxt}>{ts.tryAgain}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={st.root}>
      <GuestHeader title={ts.pageTitle} />

      <SectionList<PatientAppointment, ScheduleSection>
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />
        }
        contentContainerStyle={[
          st.listContent,
          { paddingBottom: tabBarHeight + 24 },
          sections.length === 0 ? st.listEmpty : null,
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <ScheduleSummary next={next} counts={counts} />
            <FilterBar
              search={search}
              onSearch={setSearch}
              statusFilter={statusFilter}
              onOpenStatus={() => setStatusModalOpen(true)}
              rangeFilter={rangeFilter}
              onOpenRange={() => setRangeModalOpen(true)}
              statusLabel={currentStatusLabel}
              rangeLabel={currentRangeLabel}
              hasActiveFilters={hasActiveFilters}
              onClear={clearFilters}
            />
          </>
        }
        renderSectionHeader={({ section }) => (
          <DateSectionHeader title={section.title} count={section.data.length} />
        )}
        renderItem={({ item }) => <ApptCard appt={item} />}
        SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<EmptyList hasFilters={hasActiveFilters} />}
      />

      <PickerModal<StatusFilter>
        visible={statusModalOpen}
        title={ts.filterByStatus}
        options={STATUS_OPTIONS}
        value={statusFilter}
        onSelect={(v) => { setStatusFilter(v); setStatusModalOpen(false); }}
        onClose={() => setStatusModalOpen(false)}
      />

      <PickerModal<RangeFilter>
        visible={rangeModalOpen}
        title={ts.filterByRange}
        options={RANGE_OPTIONS}
        value={rangeFilter}
        onSelect={(v) => { setRangeFilter(v); setRangeModalOpen(false); }}
        onClose={() => setRangeModalOpen(false)}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const sum = StyleSheet.create({
  wrap: { gap: 12, paddingBottom: 4 },
  nextCard: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: T.sp16,
    gap: 10,
  },
  nextCardEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
    paddingVertical: 18,
  },
  nextLabel: { flexDirection: "row", alignItems: "center", gap: 5 },
  nextLabelText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
    color: T.accent,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  nextBody: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  nextDateBadge: {
    width: 48,
    alignItems: "center",
    backgroundColor: T.accent,
    borderRadius: 10,
    paddingVertical: 8,
    gap: 1,
  },
  nextDateDay: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 20, color: "#fff" },
  nextDateMon: {
    fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 10,
    color: "rgba(255,255,255,0.8)", textTransform: "uppercase",
  },
  nextInfo: { flex: 1, gap: 4 },
  nextTitle: {
    fontFamily: "PlusJakartaSans_700Bold", fontSize: 15, color: T.text,
    letterSpacing: -0.2, lineHeight: 20,
  },
  nextMeta: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  nextMetaTxt: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 12, color: T.textMuted },
  dot: { color: T.border, fontFamily: "PlusJakartaSans_700Bold", fontSize: 12 },
  noNextTxt: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 14, color: T.textMuted },
  kpiRow: { flexDirection: "row", gap: 10 },
});

const kpi = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: T.surface, borderRadius: 14, borderWidth: 1,
    borderColor: T.border, alignItems: "center", paddingVertical: 14, gap: 4,
  },
  value: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 22, letterSpacing: -0.5 },
  label: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 11, color: T.textMuted },
});

const fb = StyleSheet.create({
  wrap: {
    gap: 10, paddingTop: T.sp12, paddingBottom: 4,
    borderTopWidth: 1, borderTopColor: T.border, marginTop: 4,
  },
  searchRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.surface, borderRadius: 12, borderWidth: 1,
    borderColor: T.border, paddingHorizontal: 12, height: 44, gap: 8,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: { flex: 1, fontFamily: "PlusJakartaSans_400Regular", fontSize: 14, color: T.text, height: 44 },
  dropRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  drop: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: T.surface, borderRadius: 10, borderWidth: 1,
    borderColor: T.border, paddingHorizontal: 12, paddingVertical: 9, flex: 1,
  },
  dropActive: { borderColor: T.accent, backgroundColor: "rgba(3,105,161,0.05)" },
  dropTxt: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 13, color: T.textSec, flex: 1 },
  dropTxtActive: { color: T.accent },
  clearBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 9,
  },
  clearTxt: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 13, color: T.danger },
});

const sh = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 12 },
  line: { flex: 1, height: 1, backgroundColor: T.border },
  text: {
    fontFamily: "PlusJakartaSans_700Bold", fontSize: 12, color: T.textSec,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: T.surfaceSubtle, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  badgeTxt: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 10, color: T.textSec },
});

const ac = StyleSheet.create({
  card: {
    flexDirection: "row", backgroundColor: T.surface,
    borderRadius: 14, borderWidth: 1, borderColor: T.border,
    padding: T.sp12, gap: T.sp12,
  },
  dateBadge: {
    width: 46, alignItems: "center", backgroundColor: T.surfaceSubtle,
    borderRadius: 10, paddingVertical: 8, gap: 1,
  },
  badgeDay: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 18, color: T.text },
  badgeMon: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 9, color: T.accent, textTransform: "uppercase" },
  badgeWd:  { fontFamily: "PlusJakartaSans_400Regular",  fontSize: 9, color: T.textMuted },
  body:     { flex: 1, gap: 5 },
  title:    { fontFamily: "PlusJakartaSans_700Bold", fontSize: 14, color: T.text, lineHeight: 19 },
  metaRow:  { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  metaTxt:  { fontFamily: "PlusJakartaSans_400Regular", fontSize: 11, color: T.textMuted },
  dot:      { color: T.border, fontFamily: "PlusJakartaSans_700Bold", fontSize: 11 },
  pill:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start" },
  pillTxt:  { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 10 },
});

const el = StyleSheet.create({
  wrap:    { alignItems: "center", paddingVertical: 48, paddingHorizontal: 32, gap: 12 },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: T.surfaceSubtle, alignItems: "center", justifyContent: "center",
  },
  title:   { fontFamily: "PlusJakartaSans_700Bold",    fontSize: 16, color: T.text,    textAlign: "center" },
  sub:     { fontFamily: "PlusJakartaSans_400Regular", fontSize: 13, color: T.textMuted, textAlign: "center", lineHeight: 19, maxWidth: 260 },
});

const st = StyleSheet.create({
  root:    { flex: 1, backgroundColor: T.bg },
  center:  { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  centerTxt: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 14, color: T.textMuted },
  errTitle:  { fontFamily: "PlusJakartaSans_700Bold",   fontSize: 17, color: T.text },
  retryBtn:  { backgroundColor: T.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: T.r10 },
  retryTxt:  { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 14, color: "#fff" },
  listContent: { padding: T.sp16, gap: 0 },
  listEmpty:   { flex: 1 },
});

const pm = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: T.sp20, paddingTop: T.sp16,
  },
  handle: {
    width: 40, height: 4, backgroundColor: T.border,
    borderRadius: 2, alignSelf: "center", marginBottom: T.sp16,
  },
  title: {
    fontFamily: "PlusJakartaSans_700Bold", fontSize: 16,
    color: T.text, marginBottom: T.sp12,
  },
  option: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 13, paddingHorizontal: T.sp4,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  optionSelected: { backgroundColor: "rgba(3,105,161,0.06)", borderRadius: T.r10, paddingHorizontal: T.sp10 },
  optLabel: { flex: 1, fontFamily: "PlusJakartaSans_500Medium", fontSize: 14, color: T.text },
  optLabelSelected: { fontFamily: "PlusJakartaSans_700Bold", color: T.accent },
});
