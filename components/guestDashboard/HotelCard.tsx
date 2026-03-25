import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import type { PatientHotel } from "@/hooks/guest/useGuestDashboard";

function fmtDate(s: string | null | undefined) {
  if (!s) return null;
  return new Date(s).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  hotel: PatientHotel | null;
}

export function HotelCard({ hotel }: Props) {
  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.header}>
        <Ionicons name="bed-outline" size={16} color={T.accent} />
        <Text style={styles.label}>Hotel</Text>
      </View>

      {!hotel ? (
        <View style={styles.empty}>
          <Ionicons name="bed-outline" size={32} color={T.textMuted} />
          <Text style={styles.emptyText}>No hotel assigned</Text>
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={styles.hotelName}>{hotel.name}</Text>
          {hotel.address ? (
            <View style={styles.row}>
              <Ionicons name="location-outline" size={14} color={T.textSec} />
              <Text style={styles.detail} numberOfLines={2}>{hotel.address}</Text>
            </View>
          ) : null}
          {hotel.roomNo ? (
            <View style={styles.row}>
              <Ionicons name="key-outline" size={14} color={T.textSec} />
              <Text style={styles.detail}>Room {hotel.roomNo}</Text>
            </View>
          ) : null}
          {hotel.checkInDate || hotel.checkOutDate ? (
            <View style={styles.stayRow}>
              <View style={styles.stayBox}>
                <Text style={styles.stayBoxLabel}>Check-in</Text>
                <Text style={styles.stayBoxDate}>{fmtDate(hotel.checkInDate) ?? "—"}</Text>
              </View>
              <View style={styles.stayDivider} />
              <View style={styles.stayBox}>
                <Text style={styles.stayBoxLabel}>Check-out</Text>
                <Text style={styles.stayBoxDate}>{fmtDate(hotel.checkOutDate) ?? "—"}</Text>
              </View>
              {hotel.stayDays ? (
                <View style={[styles.stayBox, styles.stayBoxDays]}>
                  <Text style={styles.stayBoxLabel}>Nights</Text>
                  <Text style={[styles.stayBoxDate, { color: T.accent }]}>{hotel.stayDays}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    borderWidth: 1,
    borderColor: T.border,
    padding: T.sp16,
    marginBottom: T.sp12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: T.sp12,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: T.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  empty: {
    alignItems: "center",
    paddingVertical: T.sp16,
    gap: 8,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.textMuted,
  },
  body: { gap: T.sp8 },
  hotelName: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: T.text,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  detail: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    flex: 1,
    lineHeight: 18,
  },
  stayRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: T.sp8,
    backgroundColor: T.surfaceSubtle,
    borderRadius: T.r10,
    padding: T.sp8,
    gap: 0,
  },
  stayBox: {
    flex: 1,
    alignItems: "center",
  },
  stayBoxDays: {
    flex: 0.6,
  },
  stayBoxLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: T.textMuted,
    marginBottom: 2,
  },
  stayBoxDate: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: T.text,
  },
  stayDivider: {
    width: 1,
    height: 28,
    backgroundColor: T.border,
    marginHorizontal: 4,
  },
});
