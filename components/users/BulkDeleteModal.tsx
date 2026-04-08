import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";

interface Props {
  visible: boolean;
  count: number;
  isLoading: boolean;
  blockedCount?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BulkDeleteModal({
  visible,
  count,
  isLoading,
  blockedCount,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconWrap}>
            <Ionicons name="warning-outline" size={28} color={T.danger} />
          </View>

          <Text style={styles.title}>
            Deactivate {count} {count === 1 ? "user" : "users"}?
          </Text>

          <Text style={styles.body}>
            Selected users will be deactivated immediately and will lose access
            to their accounts.
          </Text>

          <View style={styles.warnBox}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={T.warning}
            />
            <Text style={styles.warnText}>
              Primary clinic managers may require reassignment before they can
              be deactivated.
            </Text>
          </View>

          {blockedCount !== undefined && blockedCount > 0 && (
            <View style={styles.blockedBox}>
              <Ionicons name="ban-outline" size={15} color={T.danger} />
              <Text style={styles.blockedText}>
                {blockedCount}{" "}
                {blockedCount === 1 ? "user was" : "users were"} blocked
                (primary manager or self).
              </Text>
            </View>
          )}

          <View style={styles.btnRow}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.confirmBtn,
                { opacity: pressed || isLoading ? 0.8 : 1 },
              ]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={15} color="#fff" />
                  <Text style={styles.confirmText}>Deactivate</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modal: {
    backgroundColor: T.surface,
    borderRadius: T.r20,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: 14,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: T.dangerBg,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    color: T.text,
    textAlign: "center",
  },
  body: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: T.textSec,
    textAlign: "center",
    lineHeight: 20,
  },
  warnBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: T.warningBg,
    borderWidth: 1,
    borderColor: T.warningBorder,
    borderRadius: T.r10,
    padding: 12,
    width: "100%",
  },
  warnText: {
    flex: 1,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12.5,
    color: T.warningText,
    lineHeight: 17,
  },
  blockedBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: T.dangerBg,
    borderWidth: 1,
    borderColor: T.dangerBorder,
    borderRadius: T.r10,
    padding: 12,
    width: "100%",
  },
  blockedText: {
    flex: 1,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12.5,
    color: T.dangerText,
    lineHeight: 17,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: T.r12,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: T.border,
  },
  cancelText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: T.textSec,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: T.r12,
    paddingVertical: 13,
    backgroundColor: T.danger,
  },
  confirmText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    color: "#fff",
  },
});
