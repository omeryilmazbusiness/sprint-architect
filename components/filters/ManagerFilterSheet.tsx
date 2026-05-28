import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";
import { useT } from "@/hooks/useT";
import { CenteredAppModal } from "@/components/modals/CenteredAppModal";

export type GuestStatusFilter =
  | "ALL"
  | "WAITING_APPROVAL"
  | "PENDING"
  | "APPROVED"
  | "ACTIVE"
  | "INACTIVE"
  | "ENDED";

export interface GuestFilterState {
  status: GuestStatusFilter;
  pendingDocs: boolean;
  todayAppt: boolean;
}

export const DEFAULT_GUEST_FILTERS: GuestFilterState = {
  status: "ALL",
  pendingDocs: false,
  todayAppt: false,
};

interface Props {
  visible: boolean;
  current: GuestFilterState;
  onApply: (f: GuestFilterState) => void;
  onClose: () => void;
}

export function ManagerFilterSheet({ visible, current, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<GuestFilterState>(current);
  const t = useT();
  const tf = t.filterSheet;

  const statusOptions: { label: string; value: GuestStatusFilter }[] = [
    { label: tf.statusAll, value: "ALL" },
    { label: tf.statusWaitingApproval, value: "WAITING_APPROVAL" },
    { label: tf.statusPending, value: "PENDING" },
    { label: tf.statusApproved, value: "APPROVED" },
    { label: tf.statusActive, value: "ACTIVE" },
    { label: tf.statusEnded, value: "ENDED" },
  ];

  useEffect(() => {
    if (visible) setDraft(current);
  }, [visible, current]);

  function handleApply() {
    onApply(draft);
    onClose();
  }

  function handleClear() {
    onApply({ ...DEFAULT_GUEST_FILTERS });
    onClose();
  }

  const activeCount =
    (draft.status !== "ALL" ? 1 : 0) +
    (draft.pendingDocs ? 1 : 0) +
    (draft.todayAppt ? 1 : 0);

  const applyLabel =
    activeCount > 0 ? tf.applyWithCount.replace("{n}", String(activeCount)) : tf.apply;

  const title =
    activeCount > 0 ? `${tf.title} (${activeCount})` : tf.title;

  return (
    <CenteredAppModal
      visible={visible}
      onClose={onClose}
      title={title}
      testID="manager-filter-modal"
      footer={
        <View style={styles.actions}>
          <Pressable
            onPress={handleClear}
            style={({ pressed }) => [styles.btnClear, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.btnClearText}>{tf.clearAll}</Text>
          </Pressable>
          <Pressable
            onPress={handleApply}
            style={({ pressed }) => [styles.btnApply, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.btnApplyText}>{applyLabel}</Text>
          </Pressable>
        </View>
      }
    >
      <Text style={styles.sectionLabel}>{tf.sectionGuestStatus}</Text>
      <View style={styles.statusGrid}>
        {statusOptions.map(({ label, value }) => {
          const active = draft.status === value;
          return (
            <Pressable
              key={value}
              onPress={() => setDraft((d) => ({ ...d, status: value }))}
              style={[styles.statusChip, active && styles.statusChipActive]}
            >
              {active && (
                <Ionicons name="checkmark" size={12} color={T.primary} style={{ marginRight: 3 }} />
              )}
              <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.divider} />

      <View style={styles.toggleRow}>
        <View style={styles.toggleLeft}>
          <View style={[styles.toggleIcon, { backgroundColor: T.warning + "18" }]}>
            <Ionicons name="document-outline" size={16} color={T.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>{tf.pendingDocsLabel}</Text>
            <Text style={styles.toggleSub}>{tf.pendingDocsSub}</Text>
          </View>
        </View>
        <Switch
          value={draft.pendingDocs}
          onValueChange={(v) => setDraft((d) => ({ ...d, pendingDocs: v }))}
          trackColor={{ false: T.border, true: T.warning + "70" }}
          thumbColor={draft.pendingDocs ? T.warning : "#fff"}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.toggleRow}>
        <View style={styles.toggleLeft}>
          <View style={[styles.toggleIcon, { backgroundColor: T.accent + "18" }]}>
            <Ionicons name="calendar-outline" size={16} color={T.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>{tf.todayApptLabel}</Text>
            <Text style={styles.toggleSub}>{tf.todayApptSub}</Text>
          </View>
        </View>
        <Switch
          value={draft.todayAppt}
          onValueChange={(v) => setDraft((d) => ({ ...d, todayAppt: v }))}
          trackColor={{ false: T.border, true: T.accent + "70" }}
          thumbColor={draft.todayAppt ? T.accent : "#fff"}
        />
      </View>
    </CenteredAppModal>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: T.textSec,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.surfaceSubtle,
  },
  statusChipActive: {
    borderColor: T.primary,
    backgroundColor: T.primary + "10",
  },
  statusChipText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    color: T.textSec,
  },
  statusChipTextActive: {
    color: T.primary,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  divider: { height: 1, backgroundColor: T.border },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: T.sp12,
  },
  toggleLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: T.r8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  toggleLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: T.text,
  },
  toggleSub: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
    marginTop: 1,
  },
  actions: { flexDirection: "row", gap: T.sp12 },
  btnClear: {
    flex: 1,
    height: 46,
    borderRadius: T.r10,
    borderWidth: 1.5,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.surfaceSubtle,
  },
  btnClearText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 15,
    color: T.textSec,
  },
  btnApply: {
    flex: 2,
    height: 46,
    borderRadius: T.r10,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnApplyText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
});
