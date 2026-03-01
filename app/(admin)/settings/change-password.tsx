import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T } from "@/constants/adminTheme";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const POLICY_ITEMS = [
  "At least 12 characters",
  "1 uppercase letter (A–Z)",
  "1 lowercase letter (a–z)",
  "1 number (0–9)",
  "1 special character (!@#$%^&*…)",
  "Must not contain your email",
];

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={pf.wrap}>
      <Text style={pf.label}>{label}</Text>
      <View style={[pf.row, error ? pf.rowError : null]}>
        <TextInput
          style={pf.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? ""}
          placeholderTextColor={T.textMuted}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable onPress={() => setVisible(!visible)} hitSlop={8} style={pf.eye}>
          <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={18} color={T.textMuted} />
        </Pressable>
      </View>
      {error ? <Text style={pf.errorText}>{error}</Text> : null}
    </View>
  );
}

const pf = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 0.5, color: T.textSec },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: T.surfaceSubtle, borderWidth: 1.5, borderColor: T.border, borderRadius: 12, paddingHorizontal: 14 },
  rowError: { borderColor: T.danger },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: T.text, paddingVertical: 12 },
  eye: { paddingLeft: 8 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.danger },
});

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken, logout } = useAuth();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentError, setCurrentError] = useState("");
  const [nextError, setNextError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  function validate(): boolean {
    let ok = true;
    setCurrentError("");
    setNextError("");
    setConfirmError("");

    if (!current) { setCurrentError("Current password is required"); ok = false; }
    if (!next) { setNextError("New password is required"); ok = false; }
    if (next && next.length < 12) { setNextError("Must be at least 12 characters"); ok = false; }
    if (next && !/[A-Z]/.test(next)) { setNextError("Must contain at least one uppercase letter"); ok = false; }
    if (next && !/[a-z]/.test(next)) { setNextError("Must contain at least one lowercase letter"); ok = false; }
    if (next && !/[0-9]/.test(next)) { setNextError("Must contain at least one number"); ok = false; }
    if (next && !/[^A-Za-z0-9]/.test(next)) { setNextError("Must contain at least one special character"); ok = false; }
    if (next && confirm && next !== confirm) { setConfirmError("Passwords do not match"); ok = false; }
    if (!confirm) { setConfirmError("Please confirm your new password"); ok = false; }
    return ok;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      await apiRequest("POST", "/v1/admin/auth/change-password", { currentPassword: current, newPassword: next });
      Alert.alert(
        "Password Changed",
        "Your password was updated successfully. All devices have been signed out. Please log in again.",
        [{ text: "Sign In", onPress: async () => { await logout(); router.replace("/(auth)/login"); } }],
        { cancelable: false },
      );
    } catch (err: any) {
      const code = err.code ?? "";
      const msg = err.message ?? "Failed to change password";
      if (code === "AUTH_INVALID_CREDENTIALS") {
        setCurrentError("Current password is incorrect");
      } else if (code === "PASSWORD_POLICY_VIOLATION") {
        setNextError(msg);
      } else if (code === "TOO_MANY_ATTEMPTS") {
        Alert.alert("Too Many Attempts", "You have exceeded the maximum number of password change attempts. Please try again in 10 minutes.");
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const strengthColor = (() => {
    const score = [
      next.length >= 12,
      /[A-Z]/.test(next),
      /[a-z]/.test(next),
      /[0-9]/.test(next),
      /[^A-Za-z0-9]/.test(next),
    ].filter(Boolean).length;
    if (score <= 2) return T.danger;
    if (score <= 3) return T.warning;
    if (score === 4) return T.accent;
    return T.success;
  })();
  const strengthWidth = (() => {
    const score = [next.length >= 12, /[A-Z]/.test(next), /[a-z]/.test(next), /[0-9]/.test(next), /[^A-Za-z0-9]/.test(next)].filter(Boolean).length;
    return `${(score / 5) * 100}%`;
  })();

  return (
    <View style={[s.root, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={T.text} />
        </Pressable>
        <Text style={s.headerTitle}>Change Password</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.policyCard}>
          <View style={s.policyHeader}>
            <Ionicons name="shield-checkmark-outline" size={18} color={T.accent} />
            <Text style={s.policyTitle}>Password Requirements</Text>
          </View>
          {POLICY_ITEMS.map((item) => (
            <View key={item} style={s.policyRow}>
              <View style={s.policyDot} />
              <Text style={s.policyItem}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={s.form}>
          <PasswordField
            label="CURRENT PASSWORD"
            value={current}
            onChangeText={setCurrent}
            placeholder="Enter your current password"
            error={currentError}
          />

          <PasswordField
            label="NEW PASSWORD"
            value={next}
            onChangeText={(v) => { setNext(v); setNextError(""); }}
            placeholder="At least 12 characters"
            error={nextError}
          />

          {next.length > 0 && (
            <View style={s.strengthWrap}>
              <View style={s.strengthBar}>
                <View style={[s.strengthFill, { width: strengthWidth as any, backgroundColor: strengthColor }]} />
              </View>
              <Text style={[s.strengthLabel, { color: strengthColor }]}>
                {strengthWidth === "100%" ? "Strong" : strengthWidth === "80%" ? "Good" : strengthWidth === "60%" ? "Fair" : "Weak"}
              </Text>
            </View>
          )}

          <PasswordField
            label="CONFIRM NEW PASSWORD"
            value={confirm}
            onChangeText={(v) => { setConfirm(v); setConfirmError(""); }}
            placeholder="Re-enter your new password"
            error={confirmError}
          />
        </View>

        <View style={s.warningCard}>
          <Ionicons name="information-circle-outline" size={18} color={T.warning} />
          <Text style={s.warningText}>
            Changing your password will immediately revoke all active sessions across all devices. You will be logged out after this action.
          </Text>
        </View>

        <Pressable
          style={[s.submitBtn, { opacity: loading ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="lock-closed-outline" size={18} color="#fff" />
              <Text style={s.submitText}>Update Password</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.surfaceSubtle, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: T.text },
  content: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },
  policyCard: { backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 16, gap: 10 },
  policyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  policyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: T.accent },
  policyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  policyDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: T.textMuted },
  policyItem: { fontFamily: "Inter_400Regular", fontSize: 13, color: T.textSec },
  form: { gap: 14 },
  strengthWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  strengthBar: { flex: 1, height: 4, backgroundColor: T.border, borderRadius: 2, overflow: "hidden" },
  strengthFill: { height: 4, borderRadius: 2 },
  strengthLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, width: 40 },
  warningCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: T.warning + "10", borderWidth: 1, borderColor: T.warning + "30", borderRadius: 12, padding: 14 },
  warningText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: T.textSec, lineHeight: 18 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: T.primary, borderRadius: 14, paddingVertical: 15 },
  submitText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
});
