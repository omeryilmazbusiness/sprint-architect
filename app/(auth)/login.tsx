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
import { getOrCreateDeviceId } from "@/lib/device/deviceId";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo } from "@/components/common/BrandLogo";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useT } from "@/hooks/useT";
import { T } from "@/constants/adminTheme";
import { apiRequest } from "@/lib/query-client";
import {
  type SupportedLocale,
  LOCALE_LABELS,
  LOCALE_FLAGS,
  type LoginScreenDict,
} from "@/i18n/types";

type Tab = "guest" | "management";

const ALL_LOCALES: SupportedLocale[] = ["en", "ru", "tr", "es"];

// ─── Error resolution ─────────────────────────────────────────────────────────

function friendlyError(e: unknown, ls: LoginScreenDict): string {
  const msgs: Record<string, string> = {
    "AUTH-001":               ls.errAuthInvalid,
    "AUTH-002":               ls.errAuthRequired,
    "AUTH-003":               ls.errNoPermission,
    "AUTH-004":               ls.errSessionExpired,
    "BILL-001":               ls.errClinicSuspended,
    "AUTH-GUEST-001":         ls.errGuestKeyInvalid,
    "AUTH-GUEST-002":         ls.errDeviceBound,
    AUTH_INVALID_CREDENTIALS: ls.errAuthInvalid,
    PATIENT_KEY_INVALID:      ls.errGuestKeyInvalid,
    DEVICE_ALREADY_BOUND:     ls.errDeviceBound,
    CLINIC_SUSPENDED_BILLING: ls.errClinicSuspended,
    TOO_MANY_ATTEMPTS:        ls.errTooManyAttempts,
    ACCOUNT_INACTIVE:         ls.errAccountInactive,
    RATE_LIMIT_EXCEEDED:      ls.errTooManyAttempts,
  };
  if (e && typeof e === "object") {
    const err = e as { code?: string; message?: string };
    if (err.code && msgs[err.code]) return msgs[err.code];
    if (err.message) return err.message;
  }
  return ls.errGeneric;
}

// ─── Language picker modal ────────────────────────────────────────────────────

function LangPickerModal({
  visible,
  title,
  locale,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  locale: SupportedLocale;
  onSelect: (l: SupportedLocale) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={langStyles.overlay} onPress={onClose}>
        <Pressable style={langStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={langStyles.header}>
            <Text style={langStyles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color={T.textSec} />
            </Pressable>
          </View>
          {ALL_LOCALES.map((loc) => {
            const active = loc === locale;
            return (
              <Pressable
                key={loc}
                style={[langStyles.row, active && langStyles.rowActive]}
                onPress={() => { onSelect(loc); onClose(); }}
              >
                <Text style={langStyles.flag}>{LOCALE_FLAGS[loc]}</Text>
                <Text style={[langStyles.label, active && langStyles.labelActive]}>
                  {LOCALE_LABELS[loc]}
                </Text>
                {active && (
                  <Ionicons name="checkmark" size={16} color={T.primary} style={langStyles.check} />
                )}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const langStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  sheet: {
    backgroundColor: T.surface,
    borderRadius: 18,
    padding: 20,
    width: "100%",
    maxWidth: 360,
    gap: 4,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 18 },
      android: { elevation: 10 },
      default: {},
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 17, color: T.text },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  rowActive: {
    backgroundColor: T.surfaceSubtle,
  },
  flag: { fontSize: 22 },
  label: {
    flex: 1,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 15,
    color: T.textSec,
  },
  labelActive: {
    color: T.text,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  check: { marginLeft: "auto" },
});

// ─── Request modal ────────────────────────────────────────────────────────────

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
  submitLabel,
  successTitle,
  successMsg,
  doneLabel,
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
  submitLabel: string;
  successTitle: string;
  successMsg: string;
  doneLabel: string;
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
              <Text style={modalStyles.successTitle}>{successTitle}</Text>
              <Text style={modalStyles.successMsg}>{successMsg}</Text>
              <Pressable style={modalStyles.doneBtn} onPress={onClose}>
                <Text style={modalStyles.doneBtnText}>{doneLabel}</Text>
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
                  <Text style={modalStyles.submitBtnText}>{submitLabel}</Text>
                )}
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Login screen ─────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { login, loginAsPatient } = useAuth();
  const { locale, setLocale } = useLanguage();
  const t  = useT();
  const ls = t.loginScreen;

  const [tab, setTab]               = useState<Tab>("guest");
  const [guestKey, setGuestKey]     = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Stable, installation-scoped device ID loaded from SecureStore.
  // Persists across restarts; changes only on reinstall (correct security behavior).
  const [deviceId, setDeviceId] = useState<string | null>(null);
  useEffect(() => {
    getOrCreateDeviceId()
      .then(setDeviceId)
      .catch(() => {
        // Fallback: generate in-memory ID so login still works this session.
        setDeviceId(`device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
      });
  }, []);

  const passwordRef = useRef<TextInput>(null);
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(18)).current;

  const [forgotOpen, setForgotOpen]       = useState(false);
  const [forgotEmail, setForgotEmail]     = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const [reqKeyOpen, setReqKeyOpen]       = useState(false);
  const [reqKey, setReqKey]               = useState("");
  const [reqKeyLoading, setReqKeyLoading] = useState(false);
  const [reqKeySuccess, setReqKeySuccess] = useState(false);

  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  function switchTab(next: Tab) {
    if (next === tab) return;
    setTab(next);
    setError(null);
  }

  async function handleGuestLogin() {
    if (!guestKey.trim()) { setError(ls.errEnterKey); return; }
    if (!deviceId) return; // still loading — button should already be disabled
    setError(null);
    setIsLoading(true);
    try {
      await loginAsPatient(guestKey.trim(), deviceId, Platform.OS);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(patient)/dashboard");
    } catch (e) {
      setError(friendlyError(e, ls));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleManagementLogin() {
    if (!email.trim() || !password.trim()) { setError(ls.errEnterEmailPassword); return; }
    setError(null);
    setIsLoading(true);
    try {
      const role = await login(email.trim().toLowerCase(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (role === "ADMIN" || role === "SUPER_ADMIN") router.replace("/(admin)/dashboard");
      else if (role === "MANAGER") router.replace("/(manager-tabs)/dashboard");
      else router.replace("/(tabs)");
    } catch (e) {
      setError(friendlyError(e, ls));
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
    <View style={styles.rootWrap}>
      {/* ── Main scrollable login content ── */}
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
            {/* Brand header */}
            <View style={styles.brand}>
              <BrandLogo variant="login" />
              <Text style={styles.brandName}>Healory</Text>
              <Text style={styles.brandSub}>{ls.brandSub}</Text>
            </View>

            {/* Login card */}
            <View style={styles.card}>
              {/* Tab selector */}
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
                    {ls.tabGuest}
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
                    {ls.tabManagement}
                  </Text>
                </Pressable>
              </View>

              {/* Error box */}
              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color={T.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Guest form */}
              {tab === "guest" ? (
                <View style={styles.form}>
                  <Text style={styles.fieldTitle}>{ls.guestKeyLabel}</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="key-outline" size={17} color={T.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={ls.guestKeyPlaceholder}
                      placeholderTextColor={T.textMuted}
                      value={guestKey}
                      onChangeText={(v) => { setGuestKey(v); setError(null); }}
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
                  <Text style={styles.helpText}>{ls.guestKeyHelp}</Text>

                  <Pressable
                    style={[styles.primaryBtn, { opacity: (isLoading || !deviceId) ? 0.75 : 1 }]}
                    onPress={handleGuestLogin}
                    disabled={isLoading || !deviceId}
                  >
                    {(isLoading || !deviceId) ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Text style={styles.primaryBtnText}>{ls.btnContinue}</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    style={styles.linkRow}
                    onPress={() => { setReqKeyOpen(true); setReqKey(guestKey); }}
                  >
                    <Ionicons name="refresh-outline" size={13} color={T.accent} />
                    <Text style={[styles.linkText, { color: T.accent }]}>{ls.btnRequestNewKey}</Text>
                  </Pressable>
                </View>
              ) : (
                /* Management form */
                <View style={styles.form}>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>{ls.emailLabel}</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="mail-outline" size={17} color={T.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder={ls.emailPlaceholder}
                        placeholderTextColor={T.textMuted}
                        value={email}
                        onChangeText={(v) => { setEmail(v); setError(null); }}
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
                    <Text style={styles.fieldLabel}>{ls.passwordLabel}</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="lock-closed-outline" size={17} color={T.textMuted} style={styles.inputIcon} />
                      <TextInput
                        ref={passwordRef}
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor={T.textMuted}
                        value={password}
                        onChangeText={(v) => { setPassword(v); setError(null); }}
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
                        <Text style={styles.primaryBtnText}>{ls.btnLogin}</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    style={styles.linkRow}
                    onPress={() => { setForgotOpen(true); setForgotEmail(email); }}
                  >
                    <Ionicons name="lock-open-outline" size={13} color={T.textMuted} />
                    <Text style={styles.linkText}>{ls.btnForgotPassword}</Text>
                  </Pressable>
                </View>
              )}

              {/* Demo accounts */}
              <View style={styles.demoSection}>
                <Text style={styles.demoLabel}>{ls.demoSectionLabel}</Text>
                <View style={styles.demoRow}>
                  <Pressable style={styles.demoBtn} onPress={() => fillDemo("admin")}>
                    <Ionicons name="shield-outline" size={13} color={T.primary} />
                    <Text style={styles.demoBtnText}>{ls.demoAdmin}</Text>
                  </Pressable>
                  <Pressable style={styles.demoBtn} onPress={() => fillDemo("manager")}>
                    <Ionicons name="briefcase-outline" size={13} color={T.primary} />
                    <Text style={styles.demoBtnText}>{ls.demoManager}</Text>
                  </Pressable>
                  <Pressable style={[styles.demoBtn, styles.demoBtnGuest]} onPress={fillDemoGuest}>
                    <Ionicons name="key-outline" size={13} color={T.accent} />
                    <Text style={[styles.demoBtnText, { color: T.accent }]}>{ls.demoGuest}</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <Text style={styles.footer}>{ls.footer}</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Language button — floats top-right ── */}
      <Pressable
        style={[styles.langBtn, { top: topPad + 10 }]}
        onPress={() => setLangOpen(true)}
        hitSlop={8}
      >
        <Text style={styles.langBtnFlag}>{LOCALE_FLAGS[locale]}</Text>
        <Text style={styles.langBtnCode}>{locale.toUpperCase()}</Text>
        <Ionicons name="chevron-down" size={11} color={T.textMuted} />
      </Pressable>

      {/* ── Language picker modal ── */}
      <LangPickerModal
        visible={langOpen}
        title={ls.langSelectorTitle}
        locale={locale}
        onSelect={(l) => { setLocale(l); setError(null); }}
        onClose={() => setLangOpen(false)}
      />

      {/* ── Forgot password modal ── */}
      <RequestModal
        visible={forgotOpen}
        title={ls.forgotTitle}
        description={ls.forgotDesc}
        fieldLabel={ls.forgotFieldLabel}
        placeholder={ls.forgotFieldPlaceholder}
        value={forgotEmail}
        onChange={setForgotEmail}
        onSubmit={handleForgotSubmit}
        onClose={closeForgot}
        isLoading={forgotLoading}
        success={forgotSuccess}
        submitLabel={ls.modalSubmitBtn}
        successTitle={ls.modalSuccessTitle}
        successMsg={ls.modalSuccessMsg}
        doneLabel={ls.modalDone}
      />

      {/* ── Request new access key modal ── */}
      <RequestModal
        visible={reqKeyOpen}
        title={ls.reqKeyTitle}
        description={ls.reqKeyDesc}
        fieldLabel={ls.reqKeyFieldLabel}
        placeholder={ls.reqKeyFieldPlaceholder}
        value={reqKey}
        onChange={setReqKey}
        onSubmit={handleReqKeySubmit}
        onClose={closeReqKey}
        isLoading={reqKeyLoading}
        success={reqKeySuccess}
        submitLabel={ls.modalSubmitBtn}
        successTitle={ls.modalSuccessTitle}
        successMsg={ls.modalSuccessMsg}
        doneLabel={ls.modalDone}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  rootWrap: { flex: 1, backgroundColor: T.bg },
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, gap: 20 },
  inner: { flex: 1, gap: 20 },

  // Brand header
  brand: { alignItems: "center", gap: 8, paddingVertical: 12 },
  brandName: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 28, color: T.text, letterSpacing: -0.5 },
  brandSub: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 14, color: T.textSec, textAlign: "center" },

  // Card
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

  // Segment
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
  segBtnText: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 13.5, color: T.textMuted },
  segBtnTextActive: { color: T.primary, fontFamily: "PlusJakartaSans_600SemiBold" },

  // Error
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
  errorText: { flex: 1, fontFamily: "PlusJakartaSans_400Regular", fontSize: 13, color: T.danger, lineHeight: 18 },

  // Form
  form: { paddingHorizontal: 16, paddingBottom: 20, gap: 14 },
  fieldTitle: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 17, color: T.text, marginBottom: 2 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 12.5, color: T.textSec, letterSpacing: 0.2 },
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
  input: { flex: 1, fontFamily: "PlusJakartaSans_400Regular", fontSize: 15, color: T.text, padding: 0 },
  helpText: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 12.5, color: T.textMuted, marginTop: -4 },

  // Buttons
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
  primaryBtnText: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 16, color: "#fff" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 2,
    marginTop: -4,
  },
  linkText: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 12.5, color: T.textMuted },

  // Demo section
  demoSection: {
    gap: 10,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.border,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  demoLabel: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 10, letterSpacing: 1.2, color: T.textMuted },
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
  demoBtnText: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 12.5, color: T.primary },

  // Footer
  footer: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 11,
    color: T.textMuted,
    textAlign: "center",
    paddingBottom: 4,
  },

  // Language button — floats top-right
  langBtn: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  langBtnFlag: { fontSize: 14 },
  langBtnCode: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    color: T.textSec,
    letterSpacing: 0.4,
  },
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
  title: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 18, color: T.text },
  desc: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 14, color: T.textSec, lineHeight: 20 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 12.5, color: T.textSec },
  inputWrap: {
    backgroundColor: T.surfaceSubtle,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  input: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 15, color: T.text, padding: 0 },
  submitBtn: {
    backgroundColor: T.primary,
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 15, color: "#fff" },
  successBox: { alignItems: "center", gap: 12, paddingVertical: 8 },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 18, color: T.text },
  successMsg: {
    fontFamily: "PlusJakartaSans_400Regular",
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
  doneBtnText: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 15, color: "#fff" },
});
