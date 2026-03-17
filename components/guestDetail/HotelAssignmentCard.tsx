import React from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";

interface HotelData {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
}

interface Props {
  hotel: HotelData | null;
  onAssign: () => void;
}

export function HotelAssignmentCard({ hotel, onAssign }: Props) {
  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Ionicons name="business-outline" size={16} color={T.accent} />
          <Text style={styles.title}>Hotel</Text>
        </View>
        <Pressable onPress={onAssign} style={styles.editBtn}>
          <Ionicons
            name={hotel ? "pencil-outline" : "add"}
            size={16}
            color={T.accent}
          />
          <Text style={styles.editBtnText}>{hotel ? "Change" : "Assign"}</Text>
        </Pressable>
      </View>

      {hotel ? (
        <View style={styles.content}>
          <View style={styles.hotelIcon}>
            <Ionicons name="business" size={28} color={T.accent} />
          </View>
          <View style={styles.info}>
            <Text style={styles.hotelName}>{hotel.name}</Text>
            {hotel.address && (
              <View style={styles.row}>
                <Ionicons name="location-outline" size={13} color={T.textMuted} />
                <Text style={styles.rowText} numberOfLines={2}>
                  {hotel.address}
                </Text>
              </View>
            )}
            {hotel.phone && (
              <Pressable
                onPress={() =>
                  Linking.openURL(`tel:${hotel.phone}`).catch(() => null)
                }
                style={styles.row}
              >
                <Ionicons name="call-outline" size={13} color={T.accent} />
                <Text style={[styles.rowText, { color: T.accent }]}>
                  {hotel.phone}
                </Text>
              </Pressable>
            )}
            {hotel.website && (
              <Pressable
                onPress={() =>
                  Linking.openURL(hotel.website!).catch(() => null)
                }
                style={styles.row}
              >
                <Ionicons name="globe-outline" size={13} color={T.accent} />
                <Text style={[styles.rowText, { color: T.accent }]} numberOfLines={1}>
                  {hotel.website}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : (
        <Pressable onPress={onAssign} style={styles.emptyState}>
          <Ionicons name="business-outline" size={32} color={T.textMuted} />
          <Text style={styles.emptyText}>No hotel assigned</Text>
          <Text style={styles.emptyHint}>Tap Assign to add a hotel</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    padding: T.sp20,
    marginBottom: T.sp12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: T.sp16,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: T.text,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: T.r8,
    borderWidth: 1,
    borderColor: T.border,
  },
  editBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.accent,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: T.sp16,
  },
  hotelIcon: {
    width: 56,
    height: 56,
    borderRadius: T.r12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 6,
  },
  hotelName: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: T.text,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
  },
  rowText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: T.sp24,
    gap: 6,
  },
  emptyText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: T.textSec,
  },
  emptyHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
});
