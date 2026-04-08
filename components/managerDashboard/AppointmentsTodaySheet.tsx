import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { T, cardShadow } from "@/constants/adminTheme";
import { StatusPill, Divider } from "@/components/ui";
import { useT } from "@/hooks/useT";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TodayApptItem {
  id: string;
  startAt: string;
  title: string;
  status: string;
  patientId: string | null;
  patientName: string;
  doctorName: string | null;
}

interface TodayApptResponse {
  date: string;
  items: TodayApptItem[];
}

// ─── Date helper (Istanbul timezone) ─────────────────────────────────────────

function getTodayLabel(): string {
  try {
    return new Date().toLocaleDateString("en-US", {
      timeZone: "Europe/Istanbul",
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return format(new Date(), "EEEE, MMMM d");
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonTime} />
      <View style={styles.skeletonInfo}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: "55%" }]} />
      </View>
      <View style={styles.skeletonPill} />
    </View>
  );
}

// ─── Appointment Row ──────────────────────────────────────────────────────────

function ApptRow({ item }: { item: TodayApptItem }) {
  const time = format(parseISO(item.startAt), "HH:mm");

  function handlePress() {
    if (item.patientId) {
      router.push({
        pathname: "/(manager)/patients/[id]",
        params: { id: item.patientId },
      });
    }
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.78 : 1 }]}
      onPress={handlePress}
    >
      {/* Time column */}
      <View style={styles.timeBox}>
        <Text style={styles.timeText}>{time}</Text>
      </View>

      {/* Info column */}
      <View style={styles.infoCol}>
        <Text style={styles.patientName} numberOfLines={1}>
          {item.patientName}
        </Text>
        <Text style={styles.apptTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {item.doctorName ? (
          <Text style={styles.doctorName} numberOfLines={1}>
            Dr. {item.doctorName}
          </Text>
        ) : null}
      </View>

      {/* Status + chevron */}
      <View style={styles.rightCol}>
        <StatusPill status={item.status} />
        {item.patientId ? (
          <Ionicons name="chevron-forward" size={14} color={T.textMuted} style={{ marginTop: 4 }} />
        ) : null}
      </View>
    </Pressable>
  );
}

// ─── Main Sheet ───────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AppointmentsTodaySheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const ta = t.appointmentsToday;
  const [search, setSearch] = useState("");

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery<TodayApptResponse>({
    queryKey: ["/v1/manager/appointments/today"],
    staleTime: 60_000,
    enabled: visible,
  });

  const items = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (a) =>
        a.patientName.toLowerCase().includes(q) ||
        (a.doctorName ?? "").toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q),
    );
  }, [items, search]);

  function handleClose() {
    Keyboard.dismiss();
    onClose();
  }

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const todayLabel = getTodayLabel();

  const countText = `${filtered.length} ${filtered.length === 1 ? ta.apptSingular : ta.apptPlural} ${search.length > 0 ? ta.countSuffixFound : ta.countSuffixToday}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={handleClose} />

        {/* Sheet */}
        <View
          style={[
            styles.sheet,
            { paddingBottom: bottomPad + 8 },
          ]}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Sticky Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>{ta.sheetTitle}</Text>
              <Text style={styles.headerSub}>{todayLabel}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.closeBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={handleClose}
              hitSlop={12}
            >
              <Ionicons name="close" size={20} color={T.textMuted} />
            </Pressable>
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={T.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={ta.searchPlaceholder}
              placeholderTextColor={T.textMuted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
            />
            {search.length > 0 && Platform.OS !== "ios" && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={T.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Content */}
          <View style={styles.listWrap}>
            {isLoading ? (
              <View>
                {[0, 1, 2].map((i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <Divider />}
                    <SkeletonRow />
                  </React.Fragment>
                ))}
              </View>
            ) : isError ? (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIcon, { backgroundColor: T.dangerBg }]}>
                  <Ionicons name="alert-circle-outline" size={24} color={T.danger} />
                </View>
                <Text style={styles.emptyTitle}>{ta.errorTitle}</Text>
                <Text style={styles.emptyBody}>{ta.errorBody}</Text>
                <Pressable
                  style={({ pressed }) => [styles.retryBtn, { opacity: pressed ? 0.8 : 1 }]}
                  onPress={() => refetch()}
                >
                  <Text style={styles.retryText}>{ta.retry}</Text>
                </Pressable>
              </View>
            ) : filtered.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="calendar-outline" size={24} color={T.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>
                  {search.length > 0 ? ta.emptySearch : ta.emptyToday}
                </Text>
                {search.length === 0 && (
                  <Text style={styles.emptyBody}>{ta.emptyTodayBody}</Text>
                )}
              </View>
            ) : (
              <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Count badge */}
                <View style={styles.countRow}>
                  <Text style={styles.countText}>{countText}</Text>
                </View>
                {filtered.map((item, i) => (
                  <React.Fragment key={item.id}>
                    {i > 0 && <Divider />}
                    <ApptRow item={item} />
                  </React.Fragment>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    ...cardShadow,
  },

  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    color: T.text,
  },
  headerSub: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: T.textMuted,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    margin: T.sp12,
    marginBottom: 4,
    backgroundColor: T.surfaceSubtle,
    borderRadius: T.r12,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: T.sp12,
    gap: 8,
    height: 42,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: T.text,
    paddingVertical: 0,
  },

  listWrap: {
    flex: 1,
    minHeight: 160,
  },

  scroll: {
    flex: 1,
  },

  countRow: {
    paddingHorizontal: T.sp16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  countText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    color: T.textMuted,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
    gap: T.sp12,
  },
  timeBox: {
    width: 46,
    height: 38,
    borderRadius: T.r8,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
    flexShrink: 0,
  },
  timeText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12,
    color: T.accent,
  },
  infoCol: {
    flex: 1,
    gap: 1,
  },
  patientName: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 14,
    color: T.text,
  },
  apptTitle: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.text,
    opacity: 0.75,
  },
  doctorName: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 11,
    color: T.textMuted,
    marginTop: 1,
  },
  rightCol: {
    alignItems: "flex-end",
    gap: 2,
    flexShrink: 0,
  },

  emptyWrap: {
    paddingVertical: T.sp24,
    paddingHorizontal: T.sp24,
    alignItems: "center",
    gap: T.sp8,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
  },
  emptyTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 15,
    color: T.text,
    textAlign: "center",
    marginTop: 4,
  },
  emptyBody: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: T.textMuted,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: T.sp8,
    paddingHorizontal: T.sp24,
    paddingVertical: T.sp12,
    backgroundColor: T.accent,
    borderRadius: T.r8,
  },
  retryText: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 14,
    color: "#fff",
  },

  // Skeletons
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
    gap: T.sp12,
  },
  skeletonTime: {
    width: 46,
    height: 38,
    borderRadius: T.r8,
    backgroundColor: T.border,
    flexShrink: 0,
  },
  skeletonInfo: {
    flex: 1,
    gap: 6,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: T.border,
    width: "80%",
  },
  skeletonPill: {
    width: 60,
    height: 22,
    borderRadius: 11,
    backgroundColor: T.border,
    flexShrink: 0,
  },
});
