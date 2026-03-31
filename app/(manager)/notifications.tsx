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
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: "APPOINTMENT" | "DOCUMENT" | "INFO";
  status: "UNREAD" | "READ";
  relatedId?: string;
  relatedType?: string;
  createdAt: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading, isRefetching, refetch } = useQuery<Notification[]>({
    queryKey: ["/v1/manager/notifications"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/v1/manager/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/v1/manager/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/v1/manager/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/v1/manager/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/v1/manager/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/v1/manager/notifications/unread-count"] });
    },
  });

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "APPOINTMENT":
        return "calendar";
      case "DOCUMENT":
        return "document";
      case "INFO":
        return "information-circle";
      default:
        return "notifications";
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const isUnread = item.status === "UNREAD";
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          isUnread && styles.unreadCard,
          { opacity: pressed ? 0.8 : 1 }
        ]}
        onPress={() => {
          if (isUnread) {
            markReadMutation.mutate(item.id);
          }
        }}
      >
        <View style={styles.iconContainer}>
          <Ionicons 
            name={getIcon(item.type)} 
            size={24} 
            color={isUnread ? T.primary : T.textMuted} 
          />
          {isUnread && <View style={styles.unreadDot} />}
        </View>
        
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, isUnread && styles.unreadText]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.time}>
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </Text>
          </View>
          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <ManagerHeader 
        title="Notifications" 
        backButton 
        onBack={() => router.back()}
        right={
          <Pressable 
            onPress={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <Text style={styles.headerActionText}>Mark all read</Text>
          </Pressable>
        }
      />
      
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={T.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={isRefetching} 
              onRefresh={refetch} 
              tintColor={T.primary} 
            />
          }
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
    padding: T.sp16,
    gap: T.sp12,
  },
  card: {
    flexDirection: "row",
    backgroundColor: T.surface,
    borderRadius: T.r12,
    padding: T.sp16,
    ...cardShadow,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: T.primary,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.bg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: T.sp12,
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: T.primary,
    borderWidth: 2,
    borderColor: T.surface,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: T.textSec,
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    color: T.text,
    fontFamily: "Inter_700Bold",
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: T.textMuted,
  },
  body: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: T.textSec,
    lineHeight: 18,
  },
  headerActionText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: T.primary,
  },
});