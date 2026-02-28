import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  useColorScheme,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";

type LoginMode = "staff" | "patient";

export default function LoginScreen() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { login, loginAsPatient } = useAuth();

  const [mode, setMode] = useState<LoginMode>("staff");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [patientKey, setPatientKey] = useState("");
  const [deviceId] = useState(() => `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  async function handleStaffLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const role = await login(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (role === "ADMIN") router.replace("/(admin)/dashboard");
      else router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message ?? "Login failed. Please check your credentials.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePatientLogin() {
    if (!patientKey.trim()) {
      setError("Please enter your patient key.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await loginAsPatient(patientKey.trim(), deviceId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/");
    } catch (e: any) {
      setError(e.message ?? "Patient login failed.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }

  function fillDemo(role: "admin" | "manager") {
    setMode("staff");
    if (role === "admin") { setEmail("admin@demo.com"); setPassword("Admin123!"); }
    else { setEmail("manager@demo.com"); setPassword("Manager123!"); }
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function fillDemoPatient() {
    setMode("patient");
    setPatientKey("PATIENT-TEST-0001");
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[colors.primary as string, isDark ? "#00B4D8" : "#1A5276"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: topPad + 40 }]}
        >
          <View style={[styles.logoWrap, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Ionicons name="medkit" size={32} color="#fff" />
          </View>
          <Text style={[styles.brandName, { fontFamily: "Inter_700Bold" }]}>HealthTour</Text>
          <Text style={[styles.tagline, { fontFamily: "Inter_400Regular" }]}>
            Operations Platform
          </Text>
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
          <View style={[styles.modeToggle, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {(["staff", "patient"] as LoginMode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => { setMode(m); setError(null); }}
                style={[
                  styles.modeBtn,
                  mode === m && { backgroundColor: colors.accent },
                ]}
              >
                <Ionicons
                  name={m === "staff" ? "briefcase-outline" : "person-outline"}
                  size={14}
                  color={mode === m ? "#fff" : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modeBtnText,
                    {
                      color: mode === m ? "#fff" : colors.textSecondary,
                      fontFamily: "Inter_500Medium",
                    },
                  ]}
                >
                  {m === "staff" ? "Staff Login" : "Patient Login"}
                </Text>
              </Pressable>
            ))}
          </View>

          {mode === "staff" ? (
            <View style={styles.form}>
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  Email Address
                </Text>
                <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[styles.input, { color: colors.text, fontFamily: "Inter_400Regular" }]}
                    placeholder="you@clinic.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  Password
                </Text>
                <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[styles.input, { color: colors.text, fontFamily: "Inter_400Regular" }]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    returnKeyType="done"
                    onSubmitEditing={handleStaffLogin}
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)}>
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>
              </View>

              {error && (
                <View style={[styles.errorBox, { backgroundColor: colors.error + "15", borderColor: colors.error + "40" }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error, fontFamily: "Inter_400Regular" }]}>
                    {error}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={handleStaffLogin}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.loginBtn,
                  { backgroundColor: colors.accent, opacity: pressed || isLoading ? 0.85 : 1 },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={[styles.loginBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                      Sign In
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  Patient Key
                </Text>
                <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="key-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[styles.input, { color: colors.text, fontFamily: "Inter_400Regular" }]}
                    placeholder="PATIENT-XXXX-0000"
                    placeholderTextColor={colors.textMuted}
                    value={patientKey}
                    onChangeText={setPatientKey}
                    autoCapitalize="characters"
                    returnKeyType="done"
                    onSubmitEditing={handlePatientLogin}
                  />
                </View>
                <Text style={[styles.hint, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Your unique patient key is provided by your clinic.
                </Text>
              </View>

              {error && (
                <View style={[styles.errorBox, { backgroundColor: colors.error + "15", borderColor: colors.error + "40" }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error, fontFamily: "Inter_400Regular" }]}>
                    {error}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={handlePatientLogin}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.loginBtn,
                  { backgroundColor: colors.accent, opacity: pressed || isLoading ? 0.85 : 1 },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={[styles.loginBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                      Access My Dashboard
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </>
                )}
              </Pressable>
            </View>
          )}

          <View style={[styles.demoSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.demoLabel, { color: colors.textMuted, fontFamily: "Inter_500Medium" }]}>
              Demo Accounts
            </Text>
            <View style={styles.demoRow}>
              <Pressable
                onPress={() => fillDemo("admin")}
                style={({ pressed }) => [
                  styles.demoBtn,
                  { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30", opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
                <Text style={[styles.demoBtnText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                  Admin
                </Text>
              </Pressable>
              <Pressable
                onPress={() => fillDemo("manager")}
                style={({ pressed }) => [
                  styles.demoBtn,
                  { backgroundColor: colors.accent + "15", borderColor: colors.accent + "30", opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="business-outline" size={14} color={colors.accent} />
                <Text style={[styles.demoBtnText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>
                  Manager
                </Text>
              </Pressable>
              <Pressable
                onPress={fillDemoPatient}
                style={({ pressed }) => [
                  styles.demoBtn,
                  { backgroundColor: colors.success + "15", borderColor: colors.success + "30", opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="person-outline" size={14} color={colors.success} />
                <Text style={[styles.demoBtnText, { color: colors.success, fontFamily: "Inter_500Medium" }]}>
                  Patient
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Text style={[styles.footer, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
          Sprint 2 · Auth & RBAC Foundation
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    alignItems: "center",
    paddingBottom: 48,
    gap: 8,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  brandName: {
    fontSize: 32,
    color: "#fff",
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
  },
  card: {
    marginHorizontal: 20,
    marginTop: -28,
    borderRadius: 24,
    padding: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    gap: 20,
  },
  modeToggle: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  modeBtnText: { fontSize: 13 },
  form: { gap: 16 },
  fieldWrap: { gap: 6 },
  label: { fontSize: 13, marginLeft: 2 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15, padding: 0 },
  hint: { fontSize: 11, marginLeft: 2, marginTop: 2 },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 4,
  },
  loginBtnText: { fontSize: 16, color: "#fff" },
  demoSection: {
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 10,
  },
  demoLabel: { fontSize: 11, letterSpacing: 0.5, textAlign: "center" },
  demoRow: { flexDirection: "row", gap: 8 },
  demoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  demoBtnText: { fontSize: 12 },
  footer: {
    textAlign: "center",
    fontSize: 11,
    paddingVertical: 24,
  },
});
