import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";

interface Props {
  visible: boolean;
  count: number;
  isLoading: boolean;
  onConfirm: (confirmText: string) => void;
  onCancel: () => void;
}

const RULES = [
  "Your own account cannot be deleted",
  "Primary institution managers cannot be deleted",
  "Accounts that have recorded invoice payments cannot be deleted",
  "This action is permanent and cannot be undone",
];

export function DangerPurgeModal({
  visible,
  count,
  isLoading,
  onConfirm,
  onCancel,
}: Props) {
  const [typedText, setTypedText] = useState("");
  const expectedText = `PURGE ${count}`;
  const isMatch = typedText.trim() === expectedText;

  useEffect(() => {
    if (!visible) setTypedText("");
  }, [visible]);

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
            <Ionicons name="skull-outline" size={26} color="#fff" />
          </View>

          <Text style={styles.title}>Permanently delete {count} {count === 1 ? "user" : "users"}?</Text>

          <Text style={styles.body}>
            This removes the selected users from the database. All related
            records will also be deleted. This cannot be undone.
          </Text>

          <ScrollView style={styles.ruleScroll} contentContainerStyle={styles.ruleList} showsVerticalScrollIndicator={false}>
            {RULES.map((rule, i) => (
              <View key={i} style={styles.ruleRow}>
                <Ionicons name="shield-outline" size={13} color={T.danger} />
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.confirmSection}>
            <Text style={styles.confirmLabel}>
              Type <Text style={styles.confirmCode}>{expectedText}</Text> to confirm
            </Text>
            <TextInput
              style={[
                styles.confirmInput,
                typedText.length > 0 && !isMatch && styles.confirmInputError,
                isMatch && styles.confirmInputSuccess,
              ]}
              value={typedText}
              onChangeText={setTypedText}
              placeholder={expectedText}
              placeholderTextColor={T.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

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
                styles.purgeBtn,
                (!isMatch || isLoading) && styles.purgeBtnDisabled,
                { opacity: pressed && isMatch && !isLoading ? 0.8 : 1 },
              ]}
              onPress={isMatch && !isLoading ? () => onConfirm(typedText.trim()) : undefined}
              disabled={!isMatch || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={15} color="#fff" />
                  <Text style={styles.purgeText}>Delete Forever</Text>
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
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: T.surface,
    borderRadius: T.r20,
    padding: 24,
    width: "100%",
    maxWidth: 370,
    alignItems: "center",
    gap: 14,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#7f1d1d",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 19,
    color: T.text,
    textAlign: "center",
  },
  body: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13.5,
    color: T.textSec,
    textAlign: "center",
    lineHeight: 19,
  },
  ruleScroll: {
    maxHeight: 130,
    width: "100%",
  },
  ruleList: {
    gap: 6,
    paddingBottom: 2,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: "#fff5f5",
    borderRadius: T.r8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  ruleText: {
    flex: 1,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: "#991b1b",
    lineHeight: 16,
  },
  confirmSection: {
    width: "100%",
    gap: 7,
  },
  confirmLabel: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
    color: T.textSec,
  },
  confirmCode: {
    fontFamily: "PlusJakartaSans_700Bold",
    color: T.danger,
    letterSpacing: 0.5,
  },
  confirmInput: {
    height: 44,
    borderRadius: T.r10,
    borderWidth: 1.5,
    borderColor: T.border,
    paddingHorizontal: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    letterSpacing: 1,
    color: T.text,
    backgroundColor: T.surfaceSubtle,
  },
  confirmInputError: {
    borderColor: T.danger,
    backgroundColor: "#fff5f5",
  },
  confirmInputSuccess: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 2,
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
  purgeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: T.r12,
    paddingVertical: 13,
    backgroundColor: "#b91c1c",
  },
  purgeBtnDisabled: {
    backgroundColor: T.border,
  },
  purgeText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    color: "#fff",
  },
});
