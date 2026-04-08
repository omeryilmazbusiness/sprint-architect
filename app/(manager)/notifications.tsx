import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { ManagerHeader } from "@/components/manager/ManagerHeader";
import { T, cardShadow } from "@/constants/adminTheme";
import { apiRequest } from "@/lib/query-client";
import { useRouter } from "expo-router";
import { EmptyState } from "@/components/EmptyState";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useT } from "@/hooks/useT";

type NotifSeverity = "INFO" | "WARNING" | "CRITICAL";
type NotifStatus = "UNREAD" | "READ";

interface ManagerNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  severity: NotifSeverity;
  status: NotifStatus;
  relatedId?: string | null;
  relatedType?: string | null;
  createdAt: string;
  readAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ─── Icon mapping ─────────────────────────────────────────────────────────────

function getIcon(type: string): React.ComponentProps<typeof Ionicons>["name"] {
  switch (type) {
    case "APPOINTMENT_CREATED":    return "calendar-outline";
    case "APPOINTMENT_UPDATED":    return "calendar-outline";
    case "APPOINTMENT_CANCELLED":  return "calendar-clear-outline";
    case "DOCUMENT_ASSIGNED":      return "document-text-outline";
    case "DOCUMENT_APPROVED":      return "checkmark-done-outline";
    case "DOCUMENT_REJECTED":      return "document-text-outline";
    case "DOCUMENT_UPLOADED":      return "cloud-upload-outline";
    case "GUEST_CREATED":          return "person-add-outline";
    case "GUEST_APPROVED":         return "checkmark-circle-outline";
    case "GUEST_STATUS_CHANGED":   return "person-outline";
    case "INVOICE_GENERATED":      return "receipt-outline";
    case "INVOICE_OVERDUE":        return "receipt-outline";
    case "CLINIC_SUSPENDED":       return "ban-outline";
    case "HOTEL_ASSIGNED":         return "bed-outline";
    case "TRANSPORT_ASSIGNED":     return "car-outline";
    case "DOCTOR_ASSIGNED":        return "medical-outline";
    case "JOURNEY_UPDATED":        return "map-outline";
    case "WELCOME":                return "heart-outline";
    case "SCHEDULER_FAILED":
    case "BILLING_JOB_FAILED":     return "flash-off-outline";
    default:                       return "notifications-outline";
  }
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function getSeverityColor(severity: NotifSeverity): string {
  switch (severity) {
    case "CRITICAL": return T.danger;
    case "WARNING":  return T.warning;
    default:         return T.primary;
  }
}

function getTypeAccentColor(type: string): string {
  if (type === "APPOINTMENT_CANCELLED" || type === "CLINIC_SUSPENDED") return T.danger;
  if (type === "DOCUMENT_REJECTED" || type === "INVOICE_OVERDUE")       return T.warning;
  if (type === "DOCUMENT_APPROVED" || type === "GUEST_APPROVED")        return T.success;
  if (type.startsWith("APPOINTMENT"))                                    return T.accent;
  if (type.startsWith("DOCUMENT") || type === "DOCUMENT_UPLOADED")      return T.primary;
  if (type === "GUEST_CREATED")                                          return T.primary;
  if (type === "INVOICE_GENERATED")                                      return T.accent;
  if (type === "HOTEL_ASSIGNED")                                         return "#7C3AED";
  if (type === "TRANSPORT_ASSIGNED")                                     return "#0891B2";
  if (type === "DOCTOR_ASSIGNED")                                        return "#059669";
  if (type === "WELCOME")                                                return "#EC4899";
  return T.primary;
}

// ─── Navigation helper ────────────────────────────────────────────────────────

function getNavTarget(item: ManagerNotification): string | null {
  const meta = item.metadata as Record<string, string> | null | undefined;

  if (item.relatedType === "appointment" && meta?.patientId) {
    return `/(manager)/patients/${meta.patientId}`;
  }
  if (item.relatedType === "patient_document" && meta?.patientId) {
    return `/(manager)/patients/${meta.patientId}`;
  }
  if (item.relatedType === "patient" && item.relatedId) {
    return `/(manager)/patients/${item.relatedId}`;
  }
  if (item.relatedType === "invoice" && item.relatedId) {
    return `/(manager)/invoices/${item.relatedId}`;
  }
  return null;
}

// ─── NotifCard ────────────────────────────────────────────────────────────────

function NotifCard({
  item,
  onPress,
}: {
  item: ManagerNotification;
  onPress: (item: ManagerNotification) => void;
}) {
  const isUnread = item.status === "UNREAD";
  const accentColor = getTypeAccentColor(item.type);
  const severityColor = getSeverityColor(item.severity);
  const borderColor = isUnread ? severityColor : "transparent";
  const navTarget = getNavTarget(item);

  const cardBg = isUnread ? accentColor + "08" : T.surface;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cardBg, borderLeftColor: borderColor },
        { opacity: pressed ? 0.82 : 1 },
      ]}
      onPress={() => onPress(item)}
    >
      {/* Icon column */}
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: accentColor + "15",
            borderColor: accentColor + "30",
          },
        ]}
      >
        <Ionicons name={getIcon(item.type)} size={20} color={accentColor} />
        {isUnread && (
          <View style={[styles.unreadDot, { backgroundColor: severityColor }]} />
        )}
      </View>

      {/* Content column */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[styles.cardTitle, isUnread && styles.cardTitleUnread]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.time}>
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </Text>
            {navTarget !== null && (
              <Ionicons
                name="chevron-forward"
                size={13}
                color={T.textMuted}
                style={styles.chevron}
              />
            )}
          </View>
        </View>

        <Text style={styles.body} numberOfLines={3}>
          {item.body}
        </Text>

        {/* Severity badge — only for WARNING/CRITICAL */}
        {item.severity !== "INFO" && (
          <View
            style={[
              styles.severityPill,
              { backgroundColor: severityColor + "18", borderColor: severityColor + "40" },
            ]}
          >
            <View style={[styles.severityDot, { backgroundColor: severityColor }]} />
            <Text style={[styles.severityText, { color: severityColor }]}>
              {item.severity}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ManagerNotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useT();
  const tn = t.managerNotifications;
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const {
    data: notifications,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<ManagerNotification[]>({
    queryKey: ["/v1/manager/notifications"],
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PUT", `/v1/manager/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/v1/manager/notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["/v1/manager/notifications/unread-count"],
      });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/v1/manager/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/v1/manager/notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["/v1/manager/notifications/unread-count"],
      });
    },
  });

  const unreadCount =
    notifications?.filter((n) => n.status === "UNREAD").length ?? 0;

  function handleCardPress(item: ManagerNotification) {
    if (item.status === "UNREAD") {
      markReadMutation.mutate(item.id);
    }
    const target = getNavTarget(item);
    if (target) {
      router.push(target as any);
    }
  }

  return (
    <View style={styles.container}>
      <ManagerHeader
        title={tn.pageTitle}
        backButton
        onBack={() => router.back()}
        right={
          unreadCount > 0 ? (
            <Pressable
              onPress={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              style={({ pressed }) => [
                styles.markAllBtn,
                { opacity: pressed || markAllReadMutation.isPending ? 0.6 : 1 },
              ]}
            >
              {markAllReadMutation.isPending ? (
                <ActivityIndicator size={12} color={T.primary} />
              ) : (
                <Ionicons name="checkmark-done-outline" size={14} color={T.primary} />
              )}
              <Text style={styles.markAllText}>{tn.markAllRead}</Text>
            </Pressable>
          ) : undefined
        }
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={T.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomPad + 24 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={T.primary}
            />
          }
          renderItem={({ item }) => (
            <NotifCard item={item} onPress={handleCardPress} />
          )}
          ListEmptyComponent={
            <EmptyState
              title={tn.emptyTitle}
              subtitle={tn.emptySubtitle}
              icon="notifications-outline"
            />
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  markAllText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: T.primary,
  },

  // Card
  card: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    ...cardShadow,
  },

  // Icon
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 1,
    right: 1,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: T.surface,
  },

  // Content
  content: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  cardTitle: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    color: T.textSec,
    flex: 1,
    marginRight: 6,
  },
  cardTitleUnread: {
    fontFamily: "PlusJakartaSans_700Bold",
    color: T.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
  },
  time: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 11,
    color: T.textMuted,
  },
  chevron: {
    marginTop: 1,
  },
  body: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: T.textSec,
    lineHeight: 18,
  },

  // Severity badge
  severityPill: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  severityDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  severityText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
