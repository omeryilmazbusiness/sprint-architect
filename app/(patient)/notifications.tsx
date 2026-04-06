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
import { GuestHeader } from "@/components/guest/GuestHeader";
import { T, cardShadow } from "@/constants/adminTheme";
import { apiRequest } from "@/lib/query-client";
import { useRouter } from "expo-router";
import { EmptyState } from "@/components/EmptyState";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type NotifSeverity = "INFO" | "WARNING" | "CRITICAL";
type NotifStatus = "UNREAD" | "READ";
type NotifType =
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_UPDATED"
  | "APPOINTMENT_CANCELLED"
  | "DOCUMENT_ASSIGNED"
  | "DOCUMENT_APPROVED"
  | "DOCUMENT_REJECTED"
  | "JOURNEY_UPDATED"
  | "HOTEL_ASSIGNED"
  | "TRANSPORT_ASSIGNED"
  | "DOCTOR_ASSIGNED"
  | "WELCOME"
  | string;

interface GuestNotification {
  id: string;
  title: string;
  body: string;
  type: NotifType;
  severity: NotifSeverity;
  status: NotifStatus;
  relatedId?: string;
  relatedType?: string;
  createdAt: string;
  readAt?: string | null;
}

function getIcon(type: NotifType): React.ComponentProps<typeof Ionicons>["name"] {
  if (type.startsWith("APPOINTMENT")) return "calendar";
  if (type.startsWith("DOCUMENT")) return "document-text";
  if (type === "JOURNEY_UPDATED") return "map";
  if (type === "HOTEL_ASSIGNED") return "bed";
  if (type === "TRANSPORT_ASSIGNED") return "car";
  if (type === "DOCTOR_ASSIGNED") return "medical";
  if (type === "WELCOME") return "heart";
  return "notifications";
}

function getSeverityColor(severity: NotifSeverity): string {
  switch (severity) {
    case "CRITICAL": return T.danger;
    case "WARNING":  return T.warning;
    default:         return T.accent;
  }
}

function NotifCard({
  item,
  onMarkRead,
}: {
  item: GuestNotification;
  onMarkRead: (id: string) => void;
}) {
  const isUnread = item.status === "UNREAD";
  const iconColor = isUnread ? getSeverityColor(item.severity) : T.textMuted;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isUnread && styles.unreadCard,
        { opacity: pressed ? 0.82 : 1 },
      ]}
      onPress={() => {
        if (isUnread) onMarkRead(item.id);
      }}
    >
      <View style={[styles.iconWrap, { borderColor: iconColor + "33" }]}>
        <Ionicons name={getIcon(item.type)} size={22} color={iconColor} />
        {isUnread && <View style={[styles.unreadDot, { backgroundColor: iconColor }]} />}
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={[styles.title, isUnread && styles.unreadTitle]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.time}>
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </Text>
        </View>
        <Text style={styles.body} numberOfLines={3}>
          {item.body}
        </Text>
      </View>
    </Pressable>
  );
}

export default function GuestNotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const { data: notifications, isLoading, isRefetching, refetch } = useQuery<GuestNotification[]>({
    queryKey: ["/v1/patient/notifications"],
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/v1/patient/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/v1/patient/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/v1/patient/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/v1/patient/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/v1/patient/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/v1/patient/notifications/unread-count"] });
    },
  });

  const unreadCount = notifications?.filter((n) => n.status === "UNREAD").length ?? 0;

  return (
    <View style={styles.container}>
      <GuestHeader
        title="Notifications"
        onBack={() => router.back()}
        hideNotifications
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={T.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.primary} />
          }
          ListHeaderComponent={
            unreadCount > 0 ? (
              <Pressable
                style={({ pressed }) => [styles.markAllBtn, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                <Ionicons name="checkmark-done" size={16} color={T.primary} />
                <Text style={styles.markAllText}>Mark all as read</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <NotifCard
              item={item}
              onMarkRead={(id) => markReadMutation.mutate(id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No notifications"
              subtitle="You're all caught up! Notifications about your journey will appear here."
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
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: T.primary + "12",
    borderRadius: 20,
  },
  markAllText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: T.primary,
  },
  card: {
    flexDirection: "row",
    backgroundColor: T.surface,
    borderRadius: 14,
    padding: 14,
    ...cardShadow,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: T.accent,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    backgroundColor: T.bg,
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
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 3,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: T.textSec,
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontFamily: "Inter_700Bold",
    color: T.text,
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
});
