import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Animated,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { T } from "@/constants/adminTheme";
import { apiRequest } from "@/lib/query-client";

type Tab = "guest" | "management";

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: "Email or password is incorrect.",
  PATIENT_KEY_INVALID: "Access key is incorrect. Check with your clinic manager.",
  DEVICE_ALREADY_BOUND: "This access key is already active on another device. Contact your clinic.",
  CLINIC_SUSPENDED_BILLING: "Clinic access is currently suspended due to billing. Please contact support.",
  TOO_MANY_ATTEMPTS: "Too many attempts. Please wait a few minutes and try again.",
  ACCOUNT_INACTIVE: "Your account has been deactivated. Contact your administrator.",
};

function friendlyError(e: any): string {
  if (e?.code && ERROR_MESSAGES[e.code]) return ERROR_MESSAGES[e.code];
  if (e?.message) return e.message;
  return "Something went wrong. Please try again.";
}

function RequestModal({
  visible,
  title,
  description,
  fieldLabel,
  placeholder,
  value,
  onChange,
  onSubmit,
  onClose,
  isLoading,
  success,
}: {
  visible: boolean;
  title: string;
  description: string;
  fieldLabel: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  isLoading: boolean;
  success: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modalStyles.overlay} onPress={onClose}>
        <Pressable style={modalStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={T.textSec} />
            </Pressable>
          </View>

          {success ? (
            <View style={modalStyles.successBox}>
              <View style={modalStyles.successIcon}>
                <Ionicons name="checkmark-circle" size={40} color="#16A34A" />
              </View>
              <Text style={modalStyles.successTitle}>Request Submitted</Text>
              <Text style={modalStyles.successMsg}>
                Your request has been received. An administrator will process it and send your new credential to the registered contact.
              </Text>
              <Pressable style={modalStyles.doneBtn} onPress={onClose}>
                <Text style={modalStyles.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={modalStyles.desc}>{description}</Text>
              <View style={modalStyles.fieldGroup}>
                <Text style={modalStyles.fieldLabel}>{fieldLabel}</Text>
                <View style={modalStyles.inputWrap}>
                  <TextInput
                    style={modalStyles.input}
                    placeholder={placeholder}
                    placeholderTextColor={T.textMuted}
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                    onSubmitEditing={onSubmit}
                    editable={!isLoading}
                  />
                </View>
              </View>
              <Pressable
                style={[modalStyles.submitBtn, { opacity: isLoading ? 0.75 : 1 }]}
                onPress={onSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={modalStyles.submitBtnText}>Send Request</Text>
                )}
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { login, loginAsPatient } = useAuth();

  const [tab, setTab] = useState<Tab>("guest");
  const [guestKey, setGuestKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deviceId] = useState(
    () => `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );

  const passwordRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const [reqKeyOpen, setReqKeyOpen] = useState(false);
  const [reqKey, setReqKey] = useState("");
  const [reqKeyLoading, setReqKeyLoading] = useState(false);
  const [reqKeySuccess, setReqKeySuccess] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  function switchTab(t: Tab) {
    if (t === tab) return;
    setTab(t);
    setError(null);
  }

  async function handleGuestLogin() {
    if (!guestKey.trim()) {
      setError("Please enter your Guest Access Key.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await loginAsPatient(guestKey.trim(), deviceId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(patient)/dashboard");
    } catch (e: any) {
      setError(friendlyError(e));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleManagementLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const role = await login(email.trim().toLowerCase(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (role === "ADMIN" || role === "SUPER_ADMIN") router.replace("/(admin)/dashboard");
      else if (role === "MANAGER") router.replace("/(manager-tabs)/dashboard");
      else router.replace("/(tabs)");
    } catch (e: any) {
      setError(friendlyError(e));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }

  function fillDemo(role: "admin" | "manager") {
    setTab("management");
    setEmail(role === "admin" ? "admin@demo.com" : "manager@demo.com");
    setPassword(role === "admin" ? "Admin123!" : "Manager123!");
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function fillDemoGuest() {
    setTab("guest");
    setGuestKey("PATIENT-TEST-0001");
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleForgotSubmit() {
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      await apiRequest("POST", "/v1/auth/credential-requests", {
        kind: "MANAGER_PASSWORD",
        email: forgotEmail.trim().toLowerCase(),
      });
      setForgotSuccess(true);
    } catch {
      setForgotSuccess(true);
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleReqKeySubmit() {
    if (!reqKey.trim()) return;
    setReqKeyLoading(true);
    try {
      await apiRequest("POST", "/v1/auth/credential-requests", {
        kind: "GUEST_ACCESS_KEY",
        guestAccessKey: reqKey.trim().toUpperCase(),
      });
      setReqKeySuccess(true);
    } catch {
      setReqKeySuccess(true);
    } finally {
      setReqKeyLoading(false);
    }
  }

  function closeForgot() {
    setForgotOpen(false);
    setForgotEmail("");
    setForgotSuccess(false);
  }

  function closeReqKey() {
    setReqKeyOpen(false);
    setReqKey("");
    setReqKeySuccess(false);
  }

  return (
    <>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: topPad + 20, paddingBottom: bottomPad + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View
            style={[
              styles.inner,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.brand}>
              <View style={styles.logoWrap}>
                <Ionicons name="airplane" size={28} color="#fff" />
              </View>
              <Text style={styles.brandName}>HealthTour</Text>
              <Text style={styles.brandSub}>Your journey, beautifully organised.</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.segment}>
                <Pressable
                  style={[styles.segBtn, tab === "guest" && styles.segBtnActive]}
                  onPress={() => switchTab("guest")}
                >
                  <Ionicons
                    name="key-outline"
                    size={14}
                    color={tab === "guest" ? T.primary : T.textMuted}
                  />
                  <Text style={[styles.segBtnText, tab === "guest" && styles.segBtnTextActive]}>
                    Guest Login
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.segBtn, tab === "management" && styles.segBtnActive]}
                  onPress={() => switchTab("management")}
                >
                  <Ionicons
                    name="briefcase-outline"
                    size={14}
                    color={tab === "management" ? T.primary : T.textMuted}
                  />
                  <Text
                    style={[styles.segBtnText, tab === "management" && styles.segBtnTextActive]}
                  >
                    Management
                  </Text>
                </Pressable>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color={T.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {tab === "guest" ? (
                <View style={styles.form}>
                  <Text style={styles.fieldTitle}>Guest Access Key</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="key-outline" size={17} color={T.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="GUEST-XXXX-0000"
                      placeholderTextColor={T.textMuted}
                      value={guestKey}
                      onChangeText={(t) => { setGuestKey(t); setError(null); }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleGuestLogin}
                      editable={!isLoading}
                    />
                    {guestKey.length > 0 && (
                      <Pressable onPress={() => setGuestKey("")} hitSlop={8}>
                        <Ionicons name="close-circle" size={16} color={T.textMuted} />
                      </Pressable>
                    )}
                  </View>
                  <Text style={styles.helpText}>
                    Your clinic manager shares this key with you.
                  </Text>

                  <Pressable
                    style={[styles.primaryBtn, { opacity: isLoading ? 0.75 : 1 }]}
                    onPress={handleGuestLogin}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Text style={styles.primaryBtnText}>Continue</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    style={styles.linkRow}
                    onPress={() => { setReqKeyOpen(true); setReqKey(guestKey); }}
                  >
                    <Ionicons name="refresh-outline" size={13} color={T.accent} />
                    <Text style={[styles.linkText, { color: T.accent }]}>Request a New Access Key</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.form}>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Email Address</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="mail-outline" size={17} color={T.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="you@clinic.com"
                        placeholderTextColor={T.textMuted}
                        value={email}
                        onChangeText={(t) => { setEmail(t); setError(null); }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        returnKeyType="next"
                        onSubmitEditing={() => passwordRef.current?.focus()}
                        editable={!isLoading}
                      />
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Password</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="lock-closed-outline" size={17} color={T.textMuted} style={styles.inputIcon} />
                      <TextInput
                        ref={passwordRef}
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor={T.textMuted}
                        value={password}
                        onChangeText={(t) => { setPassword(t); setError(null); }}
                        secureTextEntry={!showPassword}
                        autoComplete="password"
                        returnKeyType="done"
                        onSubmitEditing={handleManagementLogin}
                        editable={!isLoading}
                      />
                      <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                        <Ionicons
                          name={showPassword ? "eye-off-outline" : "eye-outline"}
                          size={17}
                          color={T.textMuted}
                        />
                      </Pressable>
                    </View>
                  </View>

                  <Pressable
                    style={[styles.primaryBtn, { opacity: isLoading ? 0.75 : 1 }]}
                    onPress={handleManagementLogin}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Text style={styles.primaryBtnText}>Login</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    style={styles.linkRow}
                    onPress={() => { setForgotOpen(true); setForgotEmail(email); }}
                  >
                    <Ionicons name="lock-open-outline" size={13} color={T.textMuted} />
                    <Text style={styles.linkText}>Forgot password? Request a reset</Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.demoSection}>
                <Text style={styles.demoLabel}>DEMO ACCOUNTS</Text>
                <View style={styles.demoRow}>
                  <Pressable style={styles.demoBtn} onPress={() => fillDemo("admin")}>
                    <Ionicons name="shield-outline" size={13} color={T.primary} />
                    <Text style={styles.demoBtnText}>Admin</Text>
                  </Pressable>
                  <Pressable style={styles.demoBtn} onPress={() => fillDemo("manager")}>
                    <Ionicons name="briefcase-outline" size={13} color={T.primary} />
                    <Text style={styles.demoBtnText}>Manager</Text>
                  </Pressable>
                  <Pressable style={[styles.demoBtn, styles.demoBtnGuest]} onPress={fillDemoGuest}>
                    <Ionicons name="key-outline" size={13} color={T.accent} />
                    <Text style={[styles.demoBtnText, { color: T.accent }]}>Guest</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <Text style={styles.footer}>HealthTour · Secure Health Tourism Management</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <RequestModal
        visible={forgotOpen}
        title="Request Password Reset"
        description="Enter your account email. An administrator will generate a new temporary password and send it to you."
        fieldLabel="Email Address"
        placeholder="you@clinic.com"
        value={forgotEmail}
        onChange={setForgotEmail}
        onSubmit={handleForgotSubmit}
        onClose={closeForgot}
        isLoading={forgotLoading}
        success={forgotSuccess}
      />

      <RequestModal
        visible={reqKeyOpen}
        title="Request New Access Key"
        description="Enter your current Guest Access Key (if you have it) so we can identify your account. Your clinic manager will be notified."
        fieldLabel="Current Access Key (if known)"
        placeholder="GUEST-XXXX-0000"
        value={reqKey}
        onChange={setReqKey}
        onSubmit={handleReqKeySubmit}
        onClose={closeReqKey}
        isLoading={reqKeyLoading}
        success={reqKeySuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, gap: 20 },
  inner: { flex: 1, gap: 20 },
  brand: { alignItems: "center", gap: 8, paddingVertical: 12 },
  logoWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  brandName: { fontFamily: "Inter_700Bold", fontSize: 28, color: T.text, letterSpacing: -0.5 },
  brandSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textSec, textAlign: "center" },
  card: {
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  segment: {
    flexDirection: "row",
    backgroundColor: T.surfaceSubtle,
    margin: 14,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: T.border,
  },
  segBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  segBtnActive: {
    backgroundColor: T.surface,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  segBtnText: { fontFamily: "Inter_500Medium", fontSize: 13.5, color: T.textMuted },
  segBtnTextActive: { color: T.primary, fontFamily: "Inter_600SemiBold" },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 4,
    padding: 12,
    backgroundColor: T.dangerBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.dangerBorder,
  },
  errorText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: T.danger, lineHeight: 18 },
  form: { paddingHorizontal: 16, paddingBottom: 20, gap: 14 },
  fieldTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: T.text, marginBottom: 2 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 12.5, color: T.textSec, letterSpacing: 0.2 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surfaceSubtle,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 10,
  },
  inputIcon: { flexShrink: 0 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: T.text, padding: 0 },
  helpText: { fontFamily: "Inter_400Regular", fontSize: 12.5, color: T.textMuted, marginTop: -4 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: T.primary,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 4,
  },
  primaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 2,
    marginTop: -4,
  },
  linkText: { fontFamily: "Inter_400Regular", fontSize: 12.5, color: T.textMuted },
  demoSection: {
    gap: 10,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.border,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  demoLabel: { fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 1.2, color: T.textMuted },
  demoRow: { flexDirection: "row", gap: 8, justifyContent: "center" },
  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  demoBtnGuest: { borderColor: T.accent + "40" },
  demoBtnText: { fontFamily: "Inter_500Medium", fontSize: 12.5, color: T.primary },
  footer: { fontFamily: "Inter_400Regular", fontSize: 11, color: T.textMuted, textAlign: "center", paddingBottom: 4 },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 420,
    gap: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 12 },
      default: {},
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, color: T.text },
  desc: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textSec, lineHeight: 20 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 12.5, color: T.textSec },
  inputWrap: {
    backgroundColor: T.surfaceSubtle,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  input: { fontFamily: "Inter_400Regular", fontSize: 15, color: T.text, padding: 0 },
  submitBtn: {
    backgroundColor: T.primary,
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
  successBox: { alignItems: "center", gap: 12, paddingVertical: 8 },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: T.text },
  successMsg: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.textSec,
    lineHeight: 20,
    textAlign: "center",
  },
  doneBtn: {
    marginTop: 4,
    backgroundColor: T.primary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  doneBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
