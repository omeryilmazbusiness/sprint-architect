import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";

interface GuestHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function GuestHeader({
  title,
  subtitle,
  onBack,
  right,
}: GuestHeaderProps) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={[styles.header, { paddingTop: topPad }]}>
      <View style={styles.inner}>
        {onBack ? (
          <Pressable
            onPress={onBack ?? (() => router.back())}
            style={styles.backBtn}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </Pressable>
        ) : (
          <View style={styles.sideSlot} />
        )}

        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.sideSlot}>{right ?? null}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 52,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sideSlot: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: T.text,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
    marginTop: 1,
    textAlign: "center",
  },
});
