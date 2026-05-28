import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";
import { CenteredAppModal } from "@/components/modals/CenteredAppModal";

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

  const hotels: Hotel[] = data?.rows ?? data?.items ?? [];

  return (
    <CenteredAppModal
      visible={visible}
      onClose={onClose}
      title="Assign Hotel"
      scroll={false}
      bodyMinHeight={320}
      testID="assign-hotel-modal"
    >
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
          style={styles.flatList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          renderItem={({ item }) => (
            <Pressable
              onPress={() => !assigning && onSelect(item.id)}
              disabled={assigning}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            >
              <View style={styles.hotelIcon}>
                <Ionicons name="bed-outline" size={22} color={T.accent} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.stars ? (
                  <Text style={styles.stars}>{"★".repeat(Math.min(item.stars, 5))}</Text>
                ) : null}
                {item.address ? (
                  <Text style={styles.itemSub} numberOfLines={2}>
                    {item.address}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </CenteredAppModal>
  );
}

const styles = StyleSheet.create({
  loadingBox: { padding: 48, alignItems: "center" },
  emptyBox: { padding: 48, alignItems: "center", gap: 10 },
  emptyText: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 14, color: T.textMuted },
  flatList: { flex: 1, width: "100%" },
  list: { paddingBottom: 8 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
    padding: T.sp12,
    borderRadius: T.r12,
    backgroundColor: T.surfaceSubtle,
  },
  itemPressed: { opacity: 0.7, backgroundColor: "#EFF6FF" },
  hotelIcon: {
    width: 48,
    height: 48,
    borderRadius: T.r12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: { flex: 1, gap: 3 },
  itemName: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 15, color: T.text },
  stars: { fontSize: 11, color: "#F59E0B" },
  itemSub: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 12, color: T.textMuted },
  sep: { height: 8 },
});
