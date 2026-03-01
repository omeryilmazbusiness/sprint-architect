import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";

interface ManagerHeaderProps {
  title: string;
  subtitle?: string;
  onLogout?: () => void;
  right?: React.ReactNode;
  backButton?: boolean;
  onBack?: () => void;
}

export function ManagerHeader({
  title,
  subtitle,
  onLogout,
  right,
  backButton,
  onBack,
}: ManagerHeaderProps) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.header, { paddingTop: topPad + 10 }, cardShadow]}>
      <View style={styles.row}>
        {backButton ? (
          <Pressable
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={onBack}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={22} color={T.primary} />
          </Pressable>
        ) : (
          <View style={styles.brandMark}>
            <View style={styles.brandDot} />
          </View>
        )}

        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>

        <View style={styles.rightArea}>
          {right}
          {onLogout && (
            <Pressable
              style={({ pressed }) => [styles.logoutBtn, { opacity: pressed ? 0.6 : 1 }]}
              onPress={onLogout}
              hitSlop={8}
            >
              <Ionicons name="log-out-outline" size={20} color={T.textMuted} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: T.surface,
    paddingHorizontal: T.sp16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: T.r8,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  backBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: T.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
  rightArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logoutBtn: {
    padding: 4,
  },
});
