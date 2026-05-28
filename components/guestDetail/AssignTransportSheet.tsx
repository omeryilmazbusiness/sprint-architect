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
import { VehicleBrandLogo } from "@/components/brands/VehicleBrandLogo";
import { CenteredAppModal } from "@/components/modals/CenteredAppModal";

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
    <CenteredAppModal
      visible={visible}
      onClose={onClose}
      title="Assign Transport"
      scroll={false}
      bodyMinHeight={320}
      testID="assign-transport-modal"
    >
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
          style={styles.flatList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          renderItem={({ item }) => (
            <Pressable
              onPress={() => !assigning && onSelect(item.id)}
              disabled={assigning}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            >
              <VehicleBrandLogo brand={item.vehicleBrand} size={44} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>
                  {[item.vehicleBrand, item.vehicleModel].filter(Boolean).join(" ") || "Vehicle"}
                </Text>
                {item.licensePlate ? (
                  <Text style={styles.itemSub}>{item.licensePlate}</Text>
                ) : null}
                {item.driverFullName ? (
                  <Text style={styles.itemDriver}>{item.driverFullName}</Text>
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
  list: { paddingHorizontal: 16, paddingBottom: 8 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
    padding: T.sp12,
    borderRadius: T.r12,
    backgroundColor: T.surfaceSubtle,
  },
  itemPressed: { opacity: 0.7, backgroundColor: "#EFF6FF" },
  itemInfo: { flex: 1, gap: 3 },
  itemName: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 15, color: T.text },
  itemSub: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12,
    color: T.textSec,
    letterSpacing: 1,
  },
  itemDriver: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 12, color: T.textMuted },
  sep: { height: 8 },
});
