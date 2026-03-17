import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";

interface Hotel {
  id: string;
  name: string;
  address: string | null;
  stars: number | null;
  phone: string | null;
}

interface HotelListResp {
  rows?: Hotel[];
  items?: Hotel[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (hotelId: string) => void;
  assigning?: boolean;
}

export function AssignHotelSheet({
  visible,
  onClose,
  onSelect,
  assigning,
}: Props) {
  const { data, isLoading } = useQuery<HotelListResp>({
    queryKey: ["/v1/manager/hotels"],
    enabled: visible,
  });

  const hotels: Hotel[] = data?.rows ?? (data as any)?.items ?? [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Assign Hotel</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={T.textMuted} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={T.accent} />
          </View>
        ) : hotels.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="business-outline" size={36} color={T.textMuted} />
            <Text style={styles.emptyText}>No hotels available</Text>
          </View>
        ) : (
          <FlatList
            data={hotels}
            keyExtractor={(h) => h.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => !assigning && onSelect(item.id)}
                style={({ pressed }) => [
                  styles.item,
                  pressed && styles.itemPressed,
                ]}
              >
                <View style={styles.hotelIcon}>
                  <Ionicons name="business" size={24} color={T.accent} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.stars != null && (
                    <Text style={styles.stars}>
                      {"★".repeat(item.stars)}{"☆".repeat(5 - item.stars)}
                    </Text>
                  )}
                  {item.address && (
                    <Text style={styles.itemSub} numberOfLines={1}>
                      {item.address}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "72%",
    paddingBottom: Platform.OS === "web" ? 34 : 48,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: T.sp20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  sheetTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: T.text,
  },
  loadingBox: {
    padding: 48,
    alignItems: "center",
  },
  emptyBox: {
    padding: 48,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: T.textMuted,
  },
  list: {
    padding: T.sp16,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
    padding: T.sp12,
    borderRadius: T.r12,
    backgroundColor: T.surfaceSubtle,
  },
  itemPressed: {
    opacity: 0.7,
    backgroundColor: "#EFF6FF",
  },
  hotelIcon: {
    width: 48,
    height: 48,
    borderRadius: T.r12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
    gap: 3,
  },
  itemName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: T.text,
  },
  stars: {
    fontSize: 11,
    color: "#F59E0B",
  },
  itemSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
  sep: {
    height: 8,
  },
});
