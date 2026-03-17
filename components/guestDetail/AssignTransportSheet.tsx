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
import { VehicleBrandLogo } from "@/components/brands/VehicleBrandLogo";

interface Transport {
  id: string;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  licensePlate: string | null;
  driverFullName: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (transportId: string) => void;
  assigning?: boolean;
}

export function AssignTransportSheet({
  visible,
  onClose,
  onSelect,
  assigning,
}: Props) {
  const { data, isLoading } = useQuery<{ rows: Transport[] }>({
    queryKey: ["/v1/manager/transports"],
    enabled: visible,
  });

  const transports = data?.rows ?? [];

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
          <Text style={styles.sheetTitle}>Assign Transport</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={T.textMuted} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={T.accent} />
          </View>
        ) : transports.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="car-outline" size={36} color={T.textMuted} />
            <Text style={styles.emptyText}>No transports available</Text>
          </View>
        ) : (
          <FlatList
            data={transports}
            keyExtractor={(t) => t.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => !assigning && onSelect(item.id)}
                style={({ pressed }) => [
                  styles.item,
                  pressed && styles.itemPressed,
                ]}
              >
                <VehicleBrandLogo brand={item.vehicleBrand} size={44} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>
                    {[item.vehicleBrand, item.vehicleModel]
                      .filter(Boolean)
                      .join(" ") || "Vehicle"}
                  </Text>
                  {item.licensePlate && (
                    <Text style={styles.itemSub}>{item.licensePlate}</Text>
                  )}
                  {item.driverFullName && (
                    <Text style={styles.itemDriver}>{item.driverFullName}</Text>
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
  itemInfo: {
    flex: 1,
    gap: 3,
  },
  itemName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: T.text,
  },
  itemSub: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: T.textSec,
    letterSpacing: 1,
  },
  itemDriver: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
  sep: {
    height: 8,
  },
});
