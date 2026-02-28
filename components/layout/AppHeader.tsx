import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  userEmail?: string;
  userRole?: string;
  onLogout?: () => void;
  rightAction?: React.ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  userEmail,
  userRole,
  onLogout,
  rightAction,
}: AppHeaderProps) {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <LinearGradient
      colors={colors.gradient}
      style={[styles.container, { paddingTop: topPad + 12 }]}
    >
      <View style={styles.row}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { fontFamily: "Inter_400Regular" }]}>{subtitle}</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          {userEmail ? (
            <View style={styles.userChip}>
              <View style={styles.avatarDot}>
                <Text style={[styles.avatarText, { fontFamily: "Inter_700Bold" }]}>
                  {userEmail.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={[styles.chipEmail, { fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
                  {userEmail}
                </Text>
                {userRole ? (
                  <Text style={[styles.chipRole, { fontFamily: "Inter_400Regular" }]}>{userRole}</Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {rightAction ?? null}

          {onLogout ? (
            <Pressable
              onPress={onLogout}
              style={({ pressed }) => [styles.logoutBtn, { opacity: pressed ? 0.7 : 1 }]}
              hitSlop={8}
            >
              <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.85)" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleBlock: { flex: 1 },
  title: {
    fontSize: 24,
    color: "#fff",
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  userChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 140,
  },
  avatarDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 10,
    color: "#fff",
  },
  chipEmail: {
    fontSize: 11,
    color: "#fff",
    maxWidth: 90,
  },
  chipRole: {
    fontSize: 9,
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
});
