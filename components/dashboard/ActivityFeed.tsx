import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, softShadow } from "@/constants/adminTheme";
import { Card, Divider } from "@/components/ui";
import type { ActivityEntryDto } from "@/lib/api/adminDashboard";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function iconForType(type: string): {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
} {
  if (type.includes("CLINIC_CREATED"))
    return { icon: "add-circle-outline", color: T.success };
  if (type.includes("CLINIC_SUSPENDED"))
    return { icon: "ban-outline", color: T.danger };
  if (type.includes("CLINIC_REACTIVATED") || type.includes("CLINIC_UPDATED"))
    return { icon: "refresh-outline", color: T.accent };
  if (type.includes("CLINIC_DELETED"))
    return { icon: "trash-outline", color: T.danger };
  if (type.includes("INVOICE_MARKED_PAID") || type.includes("INVOICE_STATUS"))
    return { icon: "checkmark-done-outline", color: T.success };
  if (type.includes("INVOICE_GENERATED"))
    return { icon: "document-text-outline", color: T.accent };
  if (type.includes("USER_CREATED"))
    return { icon: "person-add-outline", color: T.primary };
  if (type.includes("PASSWORD"))
    return { icon: "lock-closed-outline", color: T.warning };
  return { icon: "ellipse-outline", color: T.textMuted };
}

interface ActivityRowProps {
  entry: ActivityEntryDto;
  showDivider: boolean;
}

function ActivityRow({ entry, showDivider }: ActivityRowProps) {
  const { icon, color } = iconForType(entry.type);
  return (
    <>
      {showDivider && <Divider />}
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: color + "15" }]}>
          <Ionicons name={icon} size={14} color={color} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.message} numberOfLines={2}>
            {entry.message}
          </Text>
        </View>
        <Text style={styles.time}>{timeAgo(entry.createdAt)}</Text>
      </View>
    </>
  );
}

function EmptyActivity() {
  return (
    <View style={styles.empty}>
      <Ionicons name="time-outline" size={18} color={T.textMuted} />
      <Text style={styles.emptyText}>No recent activity</Text>
    </View>
  );
}

interface Props {
  activity: ActivityEntryDto[] | undefined;
  isLoading: boolean;
}

export function ActivityFeed({ activity, isLoading }: Props) {
  return (
    <Card noPad style={softShadow}>
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : !activity || activity.length === 0 ? (
        <EmptyActivity />
      ) : (
        activity.map((entry, i) => (
          <ActivityRow key={entry.id} entry={entry} showDivider={i > 0} />
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  loader: { padding: 24, alignItems: "center" },
  empty: {
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textMuted },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: T.r8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  message: {
    fontFamily: "Inter_500Medium",
    fontSize: 13.5,
    color: T.text,
    lineHeight: 18,
  },
  time: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: T.textMuted,
    flexShrink: 0,
    marginTop: 2,
  },
});
