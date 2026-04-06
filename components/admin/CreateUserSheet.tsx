import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Clipboard,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { T } from "@/constants/adminTheme";
import { TextField } from "@/components/ui";
import { createUser, AdminUserCreated } from "@/lib/api/adminUsers";
import { listClinics, ClinicListResponse } from "@/lib/api/adminClinics";
import { useT } from "@/hooks/useT";

export interface CreateUserSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (result: AdminUserCreated) => void;
  defaultRole?: "ADMIN" | "MANAGER";
  preselectedClinicId?: string;
  preselectedClinicName?: string;
}

const ROLE_OPTIONS = [
  { value: "MANAGER" as const, label: "Manager", icon: "briefcase-outline" as const, color: T.primary },
  { value: "ADMIN" as const, label: "Admin", icon: "shield-outline" as const, color: "#7C3AED" },
];

// ─── Module-level helper components ───────────────────────────────────────────
// IMPORTANT: These are at module level to prevent keyboard focus loss.

function SegmentedControl({
  value,
  onChange,
  disabled,
}: {
  value: "MANAGER" | "ADMIN";
  onChange: (v: "MANAGER" | "ADMIN") => void;
  disabled?: boolean;
}) {
  return (
    <View style={seg.container}>
      {ROLE_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[seg.item, active && { backgroundColor: opt.color }]}
            onPress={() => !disabled && onChange(opt.value)}
            disabled={disabled}
          >
            <Ionicons name={opt.icon} size={14} color={active ? "#fff" : T.textSec} />
            <Text style={[seg.label, active && seg.activeLabel]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const seg = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: T.surfaceSubtle,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  item: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 8,
  },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: T.textSec },
  activeLabel: { color: "#fff" },
});

function ClinicPickerRow({
  value,
  label,
  onPress,
  disabled,
  placeholder,
}: {
  value: string | null;
  label: string | null;
  onPress: () => void;
  disabled?: boolean;
  placeholder: string;
}) {
  return (
    <Pressable
      style={[cpick.row, disabled && cpick.disabled]}
      onPress={disabled ? undefined : onPress}
    >
      <View style={cpick.icon}>
        <Ionicons name="business-outline" size={14} color={T.accent} />
      </View>
      <Text style={[cpick.text, !label && cpick.placeholder]} numberOfLines={1}>
        {label ?? placeholder}
      </Text>
      {!disabled && <Ionicons name="chevron-down" size={14} color={T.textMuted} />}
      {disabled && <Ionicons name="lock-closed-outline" size={13} color={T.textMuted} />}
    </Pressable>
  );
}

const cpick = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  disabled: { opacity: 0.7 },
  icon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: T.accent + "12",
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14, color: T.text },
  placeholder: { color: T.textMuted },
});

function ToggleRow({
  label,
  sublabel,
  value,
  onChange,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={tog.row}>
      <View style={{ flex: 1 }}>
        <Text style={tog.label}>{label}</Text>
        {sublabel ? <Text style={tog.sub}>{sublabel}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: T.border, true: T.primary }}
        thumbColor="#fff"
        ios_backgroundColor={T.border}
      />
    </View>
  );
}

const tog = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  label: { fontFamily: "Inter_500Medium", fontSize: 14, color: T.text },
  sub: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted, marginTop: 2 },
});

// ─── ClinicSelectorModal ───────────────────────────────────────────────────────

function ClinicSelectorModal({
  visible,
  onClose,
  onSelect,
  clinicsData,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: string, name: string) => void;
  clinicsData?: ClinicListResponse;
}) {
  const t = useT();
  const tcu = t.adminCreateUser;
  const clinics = clinicsData?.rows ?? [];
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={csel.overlay}>
        <View style={[csel.sheet, { paddingBottom: bottomPad + 8 }]}>
          <View style={csel.handle} />
          <View style={csel.header}>
            <Text style={csel.title}>{tcu.selectClinicTitle}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={T.textSec} />
            </Pressable>
          </View>
          <ScrollView>
            {clinics.map((c) => (
              <Pressable
                key={c.id}
                style={({ pressed }) => [csel.item, pressed && { backgroundColor: T.surfaceSubtle }]}
                onPress={() => { onSelect(c.id, c.name); onClose(); }}
              >
                <View style={csel.itemIcon}>
                  <Ionicons name="business-outline" size={14} color={T.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={csel.itemName}>{c.name}</Text>
                  {c.primaryManager && (
                    <Text style={csel.itemSub}>
                      {c.primaryManager.fullName ?? c.primaryManager.email}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
            {clinics.length === 0 && (
              <Text style={csel.empty}>{tcu.noActiveClinics}</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const csel = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontFamily: "Inter_700Bold", fontSize: 17, color: T.text },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  itemIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: T.accent + "12", alignItems: "center", justifyContent: "center" },
  itemName: { fontFamily: "Inter_500Medium", fontSize: 14, color: T.text },
  itemSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted, marginTop: 1 },
  empty: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textMuted, textAlign: "center", paddingVertical: 24 },
});

// ─── OtpModal ─────────────────────────────────────────────────────────────────

function OtpModal({
  visible,
  password,
  email,
  onDone,
}: {
  visible: boolean;
  password: string;
  email: string;
  onDone: () => void;
}) {
  const t = useT();
  const tcu = t.adminCreateUser;
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (Clipboard?.setString) Clipboard.setString(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={otp.overlay}>
        <View style={otp.modal}>
          <View style={otp.iconWrap}>
            <Ionicons name="key-outline" size={28} color={T.success} />
          </View>
          <Text style={otp.title}>{tcu.userCreatedTitle}</Text>
          <Text style={otp.sub}>
            {tcu.userCreatedSub.split("{email}")[0]}
            <Text style={{ fontFamily: "Inter_600SemiBold", color: T.text }}>{email}</Text>
            {tcu.userCreatedSub.split("{email}")[1] ?? ""}
          </Text>
          <Pressable style={otp.pwBox} onPress={handleCopy}>
            <Text style={otp.pwText} selectable>{password}</Text>
            <View style={otp.copyBtn}>
              <Ionicons name={copied ? "checkmark-outline" : "copy-outline"} size={15} color={copied ? T.success : T.accent} />
              <Text style={[otp.copyLabel, copied && { color: T.success }]}>
                {copied ? tcu.copied : tcu.copyLabel}
              </Text>
            </View>
          </Pressable>
          <Text style={otp.note}>{tcu.otpNote}</Text>
          <Pressable style={otp.doneBtn} onPress={onDone}>
            <Text style={otp.doneBtnText}>{tcu.done}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const otp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  modal: {
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: 24,
    width: "88%",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: T.successBg, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: T.text },
  sub: { fontFamily: "Inter_400Regular", fontSize: 13, color: T.textSec, textAlign: "center", lineHeight: 19 },
  pwBox: {
    width: "100%",
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    alignItems: "center",
  },
  pwText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: T.text,
    letterSpacing: 1,
    textAlign: "center",
  },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  copyLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: T.accent },
  note: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted, textAlign: "center" },
  doneBtn: {
    width: "100%",
    backgroundColor: T.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  doneBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
});

// ─── Main sheet ───────────────────────────────────────────────────────────────

export default function CreateUserSheet({
  visible,
  onClose,
  onCreated,
  defaultRole = "MANAGER",
  preselectedClinicId,
  preselectedClinicName,
}: CreateUserSheetProps) {
  const t = useT();
  const tcu = t.adminCreateUser;
  const qc = useQueryClient();
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const isPrefilled = !!preselectedClinicId;

  const [role, setRole] = useState<"ADMIN" | "MANAGER">(defaultRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [clinicId, setClinicId] = useState(preselectedClinicId ?? "");
  const [clinicName, setClinicName] = useState(preselectedClinicName ?? "");
  const [setAsPrimary, setSetAsPrimary] = useState(true);
  const [showClinicPicker, setShowClinicPicker] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [createdResult, setCreatedResult] = useState<AdminUserCreated | null>(null);

  useEffect(() => {
    if (visible) {
      setRole(defaultRole);
      setFullName("");
      setEmail("");
      setPhone("");
      setClinicId(preselectedClinicId ?? "");
      setClinicName(preselectedClinicName ?? "");
      setSetAsPrimary(true);
      setShowOtp(false);
      setCreatedResult(null);
    }
  }, [visible, defaultRole, preselectedClinicId, preselectedClinicName]);

  const { data: clinicsData } = useQuery<ClinicListResponse>({
    queryKey: ["/v1/admin/clinics", "all"],
    queryFn: () => listClinics({ pageSize: 200 }),
    enabled: visible && !isPrefilled,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!fullName.trim()) throw new Error("Full name is required");
      if (!email.trim()) throw new Error("Email is required");
      if (role === "MANAGER" && !clinicId) throw new Error("Clinic is required for Manager");
      return createUser({
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        phoneE164: phone.trim() || undefined,
        role,
        clinicId: role === "MANAGER" ? clinicId : null,
        setAsPrimaryManager: role === "MANAGER" ? setAsPrimary : undefined,
      });
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["/v1/admin/users"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/clinics"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/metrics"] });
      setCreatedResult(result);
      setShowOtp(true);
      onCreated?.(result);
    },
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to create user"),
  });

  function handleSubmit() {
    createMutation.mutate();
  }

  function handleOtpDone() {
    setShowOtp(false);
    onClose();
  }

  const canSubmit = fullName.trim().length > 0 && email.trim().length > 0 && (role === "ADMIN" || !!clinicId);

  return (
    <>
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: bottomPad + 16 }]}>
            <View style={styles.handle} />

            <View style={styles.headerRow}>
              <Text style={styles.title}>{tcu.sheetTitle}</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={22} color={T.textSec} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sectionLabel}>{tcu.roleSection}</Text>
              <SegmentedControl
                value={role}
                onChange={(v) => { setRole(v); if (v === "ADMIN") { setClinicId(""); setClinicName(""); } }}
                disabled={isPrefilled}
              />

              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>{tcu.identitySection}</Text>
              <View style={styles.fields}>
                <TextField
                  label={tcu.fullNameLabel}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder={tcu.fullNamePlaceholder}
                  autoCapitalize="words"
                />
                <TextField
                  label={tcu.emailLabel}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={tcu.emailPlaceholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextField
                  label={tcu.phoneLabel}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={tcu.phonePlaceholder}
                  keyboardType="phone-pad"
                />
              </View>

              {role === "MANAGER" && (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: 20 }]}>{tcu.clinicSection}</Text>
                  <ClinicPickerRow
                    value={clinicId || null}
                    label={clinicName || null}
                    onPress={() => setShowClinicPicker(true)}
                    disabled={isPrefilled}
                    placeholder={tcu.selectClinicPlaceholder}
                  />
                  {!clinicId && (
                    <Text style={styles.fieldHint}>{tcu.clinicRequiredHint}</Text>
                  )}

                  <View style={[styles.toggleSection, { marginTop: 16 }]}>
                    <ToggleRow
                      label={tcu.setPrimaryLabel}
                      sublabel={tcu.setPrimarySub}
                      value={setAsPrimary}
                      onChange={setSetAsPrimary}
                    />
                  </View>
                </>
              )}

              {role === "ADMIN" && (
                <View style={styles.infoBanner}>
                  <Ionicons name="information-circle-outline" size={16} color={T.accent} />
                  <Text style={styles.infoText}>{tcu.adminInfoBanner}</Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  { opacity: pressed || !canSubmit || createMutation.isPending ? 0.65 : 1 },
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="person-add-outline" size={18} color="#fff" />
                    <Text style={styles.submitText}>{tcu.createUserBtn}</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ClinicSelectorModal
        visible={showClinicPicker}
        onClose={() => setShowClinicPicker(false)}
        onSelect={(id, name) => { setClinicId(id); setClinicName(name); }}
        clinicsData={clinicsData}
      />

      {createdResult && (
        <OtpModal
          visible={showOtp}
          password={createdResult.generatedPassword}
          email={createdResult.email}
          onDone={handleOtpDone}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: "92%",
    paddingTop: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: "center", marginBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: T.text },
  content: { gap: 8, paddingBottom: 8 },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: T.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  fields: { gap: 10 },
  fieldHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.danger, marginTop: 4 },
  toggleSection: {
    backgroundColor: T.surfaceSubtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: T.accent + "10",
    borderWidth: 1,
    borderColor: T.accent + "30",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  infoText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: T.accent, lineHeight: 18 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: T.primary,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 24,
  },
  submitText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
});
