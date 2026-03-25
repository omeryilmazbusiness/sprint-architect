import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";

export function SupportCard() {
  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.iconWrap}>
        <Ionicons name="headset-outline" size={22} color={T.accent} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Need help?</Text>
        <Text style={styles.sub}>
          Contact your clinic coordinator for any questions about your care.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
    backgroundColor: T.surface,
    borderRadius: T.r16,
    borderWidth: 1,
    borderColor: T.border,
    padding: T.sp16,
    marginBottom: T.sp12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(3,105,161,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: T.text,
    marginBottom: 3,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    lineHeight: 18,
  },
});
