import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
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

type NotifSeverity = "INFO" | "WARNING" | "CRITICAL";
type NotifStatus = "UNREAD" | "READ";

interface ManagerNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  severity: NotifSeverity;
  status: NotifStatus;
  relatedId?: string;
  relatedType?: string;
  createdAt: string;
  readAt?: string | null;
}

function getIcon(type: string): React.ComponentProps<typeof Ionicons>["name"] {
  if (type.startsWith("APPOINTMENT")) return "calendar";
  if (type.startsWith("DOCUMENT")) return "document-text";
  if (type === "GUEST_CREATED") return "person-add";
  if (type === "GUEST_APPROVED") return "checkmark-circle";
  if (type === "GUEST_STATUS_CHANGED") return "person";
  if (type === "INVOICE_GENERATED" || type === "INVOICE_OVERDUE") return "receipt";
  if (type === "CLINIC_SUSPENDED") return "ban";
  if (type === "SCHEDULER_FAILED" || type === "BILLING_JOB_FAILED") return "alert-circle";
  return "notifications";
}

function getSeverityColor(severity: NotifSeverity): string {
  switch (severity) {
    case "CRITICAL": return T.danger;
    case "WARNING":  return T.warning;
    default:         return T.primary;
  }
}

function getSeverityBg(severity: NotifSeverity): string {
  switch (severity) {
    case "CRITICAL": return T.dangerBg ?? "#FEF2F2";
    case "WARNING":  return T.warningBg ?? "#FFFBEB";
    default:         return T.bg;
  }
}

function getNavTarget(item: ManagerNotification): string | null {
  if (item.relatedType === "patient" && item.relatedId) {
    return `/(manager)/patients/${item.relatedId}`;
  }
  if (item.relatedType === "invoice" && item.relatedId) {
    return `/(manager)/invoices/${item.relatedId}`;
  }
  return null;
}

function NotifCard({
  item,
  onPress,
}: {
  item: ManagerNotification;
  onPress: (item: ManagerNotification) => void;
}) {
  const isUnread = item.status === "UNREAD";
  const iconColor = getSeverityColor(item.severity);
  const bgColor = isUnread ? getSeverityBg(item.severity) : T.surface;
  const borderColor = isUnread ? iconColor : "transparent";
  const navTarget = getNavTarget(item);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: bgColor, borderLeftColor: borderColor },
        { opacity: pressed ? 0.82 : 1 },
      ]}
      onPress={() => onPress(item)}
    >
      <View style={[styles.iconWrap, { borderColor: iconColor + "30" }]}>
        <Ionicons name={getIcon(item.type)} size={21} color={iconColor} />
        {isUnread && <View style={[styles.unreadDot, { backgroundColor: iconColor }]} />}
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={[styles.cardTitle, isUnread && { color: T.text, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.time}>
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </Text>
            {navTarget !== null && (
              <Ionicons name="chevron-forward" size={13} color={T.textMuted} style={styles.chevron} />
            )}
          </View>
        </View>
        <Text style={styles.body} numberOfLines={3}>
          {item.body}
        </Text>
        {item.severity !== "INFO" && (
          <View style={[styles.severityPill, { backgroundColor: iconColor + "18" }]}>
            <Text style={[styles.severityText, { color: iconColor }]}>
              {item.severity}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function ManagerNotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const { data: notifications, isLoading, isRefetching, refetch } = useQuery<ManagerNotification[]>({
    queryKey: ["/v1/manager/notifications"],
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/v1/manager/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/v1/manager/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/v1/manager/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/v1/manager/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/v1/manager/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/v1/manager/notifications/unread-count"] });
    },
  });

  const unreadCount = notifications?.filter((n) => n.status === "UNREAD").length ?? 0;

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
        title="Notifications"
        backButton
        onBack={() => router.back()}
        right={
          unreadCount > 0 ? (
            <Pressable
              onPress={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          ) : undefined
        }
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={T.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.primary} />
          }
          renderItem={({ item }) => (
            <NotifCard item={item} onPress={handleCardPress} />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No notifications"
              subtitle="You're all caught up!"
              icon="notifications-outline"
            />
          }
        />
      )}
    </View>
  );
}

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
  markAllText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: T.primary,
  },
  card: {
    flexDirection: "row",
    backgroundColor: T.surface,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    ...cardShadow,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    backgroundColor: T.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
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
  content: {
    flex: 1,
    gap: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
  },
  chevron: {
    marginTop: 1,
  },
  cardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: T.textSec,
    flex: 1,
    marginRight: 6,
  },
  time: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: T.textMuted,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    lineHeight: 18,
  },
  severityPill: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  severityText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
