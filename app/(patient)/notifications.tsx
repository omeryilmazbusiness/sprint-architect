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
import { ru as dateFnsRu } from "date-fns/locale";
import { GuestHeader } from "@/components/guest/GuestHeader";
import { T, cardShadow } from "@/constants/adminTheme";
import { apiRequest } from "@/lib/query-client";
import { useRouter } from "expo-router";
import { EmptyState } from "@/components/EmptyState";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useT } from "@/hooks/useT";
import { useLanguage } from "@/context/LanguageContext";

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
  relatedId?: string | null;
  relatedType?: string | null;
  createdAt: string;
  readAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ─── Icon mapping ─────────────────────────────────────────────────────────────

function getIcon(type: NotifType): React.ComponentProps<typeof Ionicons>["name"] {
  switch (type) {
    case "APPOINTMENT_CREATED":   return "calendar-outline";
    case "APPOINTMENT_UPDATED":   return "calendar-outline";
    case "APPOINTMENT_CANCELLED": return "calendar-clear-outline";
    case "DOCUMENT_ASSIGNED":     return "document-text-outline";
    case "DOCUMENT_APPROVED":     return "checkmark-done-outline";
    case "DOCUMENT_REJECTED":     return "document-text-outline";
    case "JOURNEY_UPDATED":       return "map-outline";
    case "HOTEL_ASSIGNED":        return "bed-outline";
    case "TRANSPORT_ASSIGNED":    return "car-outline";
    case "DOCTOR_ASSIGNED":       return "person-outline";
    case "WELCOME":               return "heart-outline";
    default:                      return "notifications-outline";
  }
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function getTypeAccentColor(type: NotifType): string {
  switch (type) {
    case "APPOINTMENT_CREATED":   return T.accent;
    case "APPOINTMENT_UPDATED":   return T.accent;
    case "APPOINTMENT_CANCELLED": return T.danger;
    case "DOCUMENT_ASSIGNED":     return T.primary;
    case "DOCUMENT_APPROVED":     return T.success;
    case "DOCUMENT_REJECTED":     return T.warning;
    case "JOURNEY_UPDATED":       return T.accent;
    case "HOTEL_ASSIGNED":        return "#7C3AED";
    case "TRANSPORT_ASSIGNED":    return "#0891B2";
    case "DOCTOR_ASSIGNED":       return "#059669";
    case "WELCOME":               return "#EC4899";
    default:                      return T.primary;
  }
}

function getSeverityColor(severity: NotifSeverity): string {
  switch (severity) {
    case "CRITICAL": return T.danger;
    case "WARNING":  return T.warning;
    default:         return T.accent;
  }
}

// ─── Navigation helper ────────────────────────────────────────────────────────

function getNavTarget(type: NotifType): string | null {
  if (
    type === "APPOINTMENT_CREATED" ||
    type === "APPOINTMENT_UPDATED" ||
    type === "APPOINTMENT_CANCELLED"
  ) {
    return "/(patient)/schedule";
  }
  if (
    type === "DOCUMENT_ASSIGNED" ||
    type === "DOCUMENT_APPROVED" ||
    type === "DOCUMENT_REJECTED"
  ) {
    return "/(patient)/profile";
  }
  if (
    type === "HOTEL_ASSIGNED" ||
    type === "TRANSPORT_ASSIGNED" ||
    type === "DOCTOR_ASSIGNED" ||
    type === "JOURNEY_UPDATED"
  ) {
    return "/(patient)/dashboard";
  }
  return null;
}

// ─── NotifCard ────────────────────────────────────────────────────────────────

function NotifCard({
  item,
  onPress,
}: {
  item: GuestNotification;
  onPress: (item: GuestNotification) => void;
}) {
  const t = useT();
  const tn = t.guestNotifications;
  const { locale } = useLanguage();

  const isUnread = item.status === "UNREAD";
  const accentColor = getTypeAccentColor(item.type);
  const severityColor = getSeverityColor(item.severity);
  const navTarget = getNavTarget(item.type);

  const timeAgo = formatDistanceToNow(new Date(item.createdAt), {
    addSuffix: true,
    locale: locale === "ru" ? dateFnsRu : undefined,
  });

  const severityLabel =
    item.severity === "WARNING" ? tn.severityWarning : tn.severityCritical;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isUnread && { borderLeftColor: accentColor, backgroundColor: accentColor + "08" },
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
        <Ionicons name={getIcon(item.type)} size={21} color={accentColor} />
        {isUnread && (
          <View style={[styles.unreadDot, { backgroundColor: severityColor }]} />
        )}
      </View>

      {/* Content column */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[styles.title, isUnread && styles.titleUnread]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.time}>{timeAgo}</Text>
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
              {
                backgroundColor: severityColor + "18",
                borderColor: severityColor + "40",
              },
            ]}
          >
            <View style={[styles.severityDot, { backgroundColor: severityColor }]} />
            <Text style={[styles.severityText, { color: severityColor }]}>
              {severityLabel}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GuestNotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const t = useT();
  const tn = t.guestNotifications;

  const {
    data: notifications,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<GuestNotification[]>({
    queryKey: ["/v1/patient/notifications"],
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PUT", `/v1/patient/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/v1/patient/notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["/v1/patient/notifications/unread-count"],
      });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/v1/patient/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/v1/patient/notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["/v1/patient/notifications/unread-count"],
      });
    },
  });

  const unreadCount =
    notifications?.filter((n) => n.status === "UNREAD").length ?? 0;

  function handleCardPress(item: GuestNotification) {
    if (item.status === "UNREAD") {
      markReadMutation.mutate(item.id);
    }
    const target = getNavTarget(item.type);
    if (target) {
      router.back();
      router.push(target as any);
    }
  }

  return (
    <View style={styles.container}>
      <GuestHeader
        title={tn.pageTitle}
        onBack={() => router.back()}
        hideNotifications
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
          ListHeaderComponent={
            unreadCount > 0 ? (
              <Pressable
                style={({ pressed }) => [
                  styles.markAllBtn,
                  { opacity: pressed || markAllReadMutation.isPending ? 0.7 : 1 },
                ]}
                onPress={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                {markAllReadMutation.isPending ? (
                  <ActivityIndicator size={13} color={T.primary} />
                ) : (
                  <Ionicons name="checkmark-done-outline" size={15} color={T.primary} />
                )}
                <Text style={styles.markAllText}>{tn.markAllRead}</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <NotifCard item={item} onPress={handleCardPress} />
          )}
          ListEmptyComponent={
            <EmptyState
              title={tn.emptyTitle}
              subtitle={tn.emptySub}
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
    gap: 6,
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 8,
    backgroundColor: T.primary + "12",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.primary + "25",
  },
  markAllText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: T.primary,
  },
  card: {
    flexDirection: "row",
    backgroundColor: T.surface,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
    ...cardShadow,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  content: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 3,
  },
  title: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    color: T.textSec,
    flex: 1,
    marginRight: 6,
  },
  titleUnread: {
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
