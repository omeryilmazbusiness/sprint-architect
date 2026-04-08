import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSystemError } from "@/context/SystemErrorContext";

export function MaintenanceBottomSheet() {
  const { errorInfo, clearSystemError } = useSystemError();
  const insets = useSafeAreaInsets();

  if (!errorInfo) return null;

  return (
    <Modal
      visible={!!errorInfo}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={clearSystemError}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={clearSystemError} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.handle} />

          <View style={styles.iconRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="construct-outline" size={28} color="#d97706" />
            </View>
          </View>

          <Text style={styles.title}>Sistem bakım sürecindedir</Text>
          <Text style={styles.subtitle}>
            Lütfen daha sonra tekrar deneyin.
          </Text>

          {errorInfo.code && (
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>Hata Kodu</Text>
              <Text style={styles.codeValue}>{errorInfo.code}</Text>
              {errorInfo.requestId && (
                <Text style={styles.requestIdValue} numberOfLines={1}>
                  Ref: {errorInfo.requestId}
                </Text>
              )}
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.closeBtn,
              { opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={clearSystemError}
          >
            <Text style={styles.closeBtnText}>Kapat</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.40)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: "center",
    gap: 12,
    ...(Platform.OS === "web" ? { maxWidth: 480, alignSelf: "center", width: "100%" } : {}),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    marginBottom: 4,
  },
  iconRow: {
    alignItems: "center",
    marginBottom: 4,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fffbeb",
    borderWidth: 1.5,
    borderColor: "#fde68a",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  codeBox: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  codeLabel: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 11,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  codeValue: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    color: "#DC2626",
    letterSpacing: 1.5,
    fontVariant: ["tabular-nums"],
  },
  requestIdValue: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 10,
    color: "#9CA3AF",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  closeBtn: {
    width: "100%",
    backgroundColor: "#0A3D62",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  closeBtnText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    color: "#fff",
  },
});
