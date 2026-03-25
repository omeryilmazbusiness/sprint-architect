import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";

interface Props {
  patientName?: string;
  onLogout?: () => void;
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function GuestHeader({ patientName, onLogout }: Props) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPad + 12 }]}>
      <View style={styles.left}>
        <Text style={styles.date}>{todayLabel()}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {patientName ?? "Welcome"}
        </Text>
      </View>
      <Pressable onPress={onLogout} style={styles.logoutBtn} hitSlop={10}>
        <Ionicons name="log-out-outline" size={20} color={T.textSec} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: T.sp20,
    paddingBottom: T.sp16,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  left: { flex: 1, marginRight: 12 },
  date: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
    marginBottom: 3,
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: T.text,
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
