import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { GUEST_REQUESTED_SERVICES } from "@shared/guestRequestedServices";
import type { GuestRequestedServiceCode } from "@shared/guestRequestedServices";
import { T, cardShadow } from "@/constants/adminTheme";
import { PhonePickerInput, type PhonePickerValue } from "@/components/forms/PhonePickerInput";
import { DatePickerModal } from "@/components/manager/DatePickerModal";
import { apiRequest } from "@/lib/query-client";
import { copyToClipboard } from "@/lib/clipboard";
import { useT } from "@/hooks/useT";
import { NationalityPickerModal } from "./NationalityPickerModal";
import {
  buildCreateGuestPayload,
  isStepComplete,
  validateCreateGuestStep,
} from "./validateCreateGuest";
import type { CreatedGuestResult, CreateGuestFormState, WizardStep } from "./types";
import { WIZARD_STEPS } from "./types";

const EMPTY_PHONE: PhonePickerValue = { raw: "", e164: null, countryCode: "TR" };

const EMPTY_FORM: CreateGuestFormState = {
  fullName: "",
  nationalityCode: "",
  nationality: "",
  nationalityFlag: "",
  phone: EMPTY_PHONE,
  email: "",
  requestedServices: [],
  arrivalDate: "",
  departureDate: "",
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

function WizardProgress({
  stepIndex,
  labels,
}: {
  stepIndex: number;
  labels: ReturnType<typeof useT>["createGuest"];
}) {
  return (
    <View style={styles.progressRow}>
      {WIZARD_STEPS.map((_, i) => (
        <View
          key={WIZARD_STEPS[i]}
          style={[styles.progressDot, i <= stepIndex && styles.progressDotActive]}
        />
      ))}
      <Text style={styles.progressText}>
        {labels.wizardStepOf
          .replace("{current}", String(stepIndex + 1))
          .replace("{total}", String(WIZARD_STEPS.length))}
      </Text>
    </View>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {required ? <Text style={styles.required}>*</Text> : null}
      </View>
      {children}
      {error ? <Text style={styles.inlineError}>{error}</Text> : null}
    </View>
  );
}

export function CreateGuestWizard({ visible, onClose }: Props) {
  const t = useT();
  const cg = t.createGuest;
  const qc = useQueryClient();

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<CreateGuestFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<ReturnType<typeof validateCreateGuestStep>>({});
  const [showNationality, setShowNationality] = useState(false);
  const [showArrival, setShowArrival] = useState(false);
  const [showDeparture, setShowDeparture] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [createdPatient, setCreatedPatient] = useState<CreatedGuestResult | null>(null);

  const step = WIZARD_STEPS[stepIndex];

  const setField = useCallback(<K extends keyof CreateGuestFormState>(
    key: K,
    value: CreateGuestFormState[K],
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }, []);

  const toggleService = useCallback((code: GuestRequestedServiceCode) => {
    setForm((f) => ({
      ...f,
      requestedServices: f.requestedServices.includes(code)
        ? f.requestedServices.filter((x) => x !== code)
        : [...f.requestedServices, code],
    }));
    setErrors((e) => ({ ...e, requestedServices: undefined }));
  }, []);

  const stepMeta = useMemo(() => {
    if (step === "guest") return { title: cg.stepGuestTitle, subtitle: cg.stepGuestSubtitle };
    if (step === "services") return { title: cg.stepServicesTitle, subtitle: cg.stepServicesSubtitle };
    return { title: cg.stepTravelTitle, subtitle: cg.stepTravelSubtitle };
  }, [step, cg]);

  const canAdvance = isStepComplete(step, form);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/v1/manager/patients", buildCreateGuestPayload(form));
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? "Failed to create guest");
      }
      return res.json() as Promise<CreatedGuestResult>;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/patients"], exact: false });
      qc.invalidateQueries({ queryKey: ["/v1/manager/metrics"], exact: false });
      qc.invalidateQueries({ queryKey: ["/v1/manager/dashboard"], exact: false });
      setCreatedPatient(data);
    },
  });

  function handleClose() {
    setForm(EMPTY_FORM);
    setErrors({});
    setStepIndex(0);
    setCreatedPatient(null);
    setCopiedKey(false);
    onClose();
  }

  function goNext() {
    const stepErrors = validateCreateGuestStep(step, form, cg);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    if (stepIndex < WIZARD_STEPS.length - 1) {
      setStepIndex((i) => i + 1);
      return;
    }
    mutation.mutate();
  }

  function goBack() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
    else handleClose();
  }

  async function handleCopyKey() {
    if (!createdPatient) return;
    const ok = await copyToClipboard(createdPatient.patientKey);
    if (ok) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 3000);
    }
  }

  function handleOpenGuest() {
    if (!createdPatient) return;
    handleClose();
    router.push({ pathname: "/(manager)/patients/[id]", params: { id: createdPatient.id } });
  }

  const isLastStep = stepIndex === WIZARD_STEPS.length - 1;
  const primaryLabel = isLastStep ? cg.submitBtn : cg.btnNext;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={handleClose}
    >
      {createdPatient ? (
        <View style={styles.successRoot}>
          <View style={styles.header}>
            <View style={{ width: 34 }} />
            <Text style={styles.headerTitle}>{cg.successHeaderTitle}</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={T.text} />
            </Pressable>
          </View>
          <View style={styles.successBody}>
            <Ionicons name="checkmark-circle" size={64} color={T.success} />
            <Text style={styles.successName}>{createdPatient.fullName}</Text>
            <Text style={styles.successSubtitle}>{cg.successAddedTo}</Text>
            <View style={styles.keyCard}>
              <Text style={styles.keyLabel}>{cg.keyLabel}</Text>
              <View style={styles.keyRow}>
                <Text style={styles.keyValue} selectable>
                  {createdPatient.patientKey}
                </Text>
                <Pressable onPress={handleCopyKey} style={styles.copyBtn}>
                  <Ionicons
                    name={copiedKey ? "checkmark-circle" : "copy-outline"}
                    size={20}
                    color={copiedKey ? T.success : T.primary}
                  />
                  <Text style={[styles.copyBtnText, copiedKey && { color: T.success }]}>
                    {copiedKey ? cg.copied : cg.copy}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.keyHint}>{cg.keyHint}</Text>
            </View>
            <Pressable style={styles.openGuestBtn} onPress={handleOpenGuest}>
              <Ionicons name="person-outline" size={18} color="#fff" />
              <Text style={styles.openGuestBtnText}>{cg.openGuestProfile}</Text>
            </Pressable>
            <Pressable style={styles.doneBtn} onPress={handleClose}>
              <Text style={styles.doneBtnText}>{cg.done}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.root}>
          <View style={styles.header}>
            <Pressable onPress={goBack} hitSlop={12}>
              <Ionicons name={stepIndex > 0 ? "arrow-back" : "close"} size={22} color={T.text} />
            </Pressable>
            <Text style={styles.headerTitle}>{cg.headerTitle}</Text>
            <View style={{ width: 34 }} />
          </View>

          <WizardProgress stepIndex={stepIndex} labels={cg} />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepTitle}>{stepMeta.title}</Text>
            <Text style={styles.stepSubtitle}>{stepMeta.subtitle}</Text>

            {step === "guest" && (
              <>
                <Field label={cg.fieldFullName} required error={errors.fullName}>
                  <TextInput
                    style={[styles.input, errors.fullName && styles.inputError]}
                    placeholder={cg.fieldFullNamePlaceholder}
                    placeholderTextColor={T.textMuted}
                    value={form.fullName}
                    onChangeText={(v) => setField("fullName", v)}
                    autoCapitalize="words"
                  />
                </Field>
                <Field label={cg.fieldNationality} required error={errors.nationality}>
                  <Pressable
                    style={[styles.pickerBtn, errors.nationality && styles.inputError]}
                    onPress={() => setShowNationality(true)}
                  >
                    <Text
                      style={
                        form.nationalityCode ? styles.pickerBtnText : styles.pickerBtnPlaceholder
                      }
                    >
                      {form.nationalityCode
                        ? `${form.nationalityFlag}  ${form.nationality}`
                        : cg.fieldNationalityPlaceholder}
                    </Text>
                    <Ionicons name="chevron-down" size={15} color={T.textMuted} />
                  </Pressable>
                </Field>
                <Field label={cg.fieldPhone} required error={errors.phone}>
                  <PhonePickerInput
                    value={form.phone}
                    onChange={(v) => setField("phone", v)}
                    hasError={!!errors.phone}
                  />
                </Field>
                <Field label={cg.fieldEmail} error={errors.email}>
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    placeholder={cg.fieldEmailPlaceholder}
                    placeholderTextColor={T.textMuted}
                    value={form.email}
                    onChangeText={(v) => setField("email", v)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </Field>
              </>
            )}

            {step === "services" && (
              <View style={styles.serviceGrid}>
                {GUEST_REQUESTED_SERVICES.map(({ code, icon }) => {
                  const active = form.requestedServices.includes(code);
                  const label = cg.serviceLabels[code] ?? code;
                  return (
                    <Pressable
                      key={code}
                      style={[styles.serviceCard, active && styles.serviceCardActive]}
                      onPress={() => toggleService(code)}
                    >
                      <View
                        style={[
                          styles.serviceIconWrap,
                          { backgroundColor: active ? T.primary + "18" : T.surfaceSubtle },
                        ]}
                      >
                        <Ionicons
                          name={icon as keyof typeof Ionicons.glyphMap}
                          size={22}
                          color={active ? T.primary : T.textMuted}
                        />
                      </View>
                      <Text
                        style={[styles.serviceCardLabel, active && styles.serviceCardLabelActive]}
                        numberOfLines={2}
                      >
                        {label}
                      </Text>
                      {active ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={T.primary}
                          style={styles.serviceCheck}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
                {errors.requestedServices ? (
                  <Text style={styles.inlineError}>{errors.requestedServices}</Text>
                ) : null}
              </View>
            )}

            {step === "travel" && (
              <>
                <View style={styles.dateRow}>
                  <View style={{ flex: 1 }}>
                    <Field label={cg.fieldArrivalDate} required error={errors.arrivalDate}>
                      <Pressable
                        style={[styles.pickerBtn, errors.arrivalDate && styles.inputError]}
                        onPress={() => setShowArrival(true)}
                      >
                        <Ionicons name="calendar-outline" size={15} color={T.textMuted} />
                        <Text
                          style={[
                            form.arrivalDate ? styles.pickerBtnText : styles.pickerBtnPlaceholder,
                            { marginLeft: 6, flex: 1 },
                          ]}
                        >
                          {form.arrivalDate || cg.fieldArrivalPlaceholder}
                        </Text>
                      </Pressable>
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label={cg.fieldDepartureDate} required error={errors.departureDate}>
                      <Pressable
                        style={[styles.pickerBtn, errors.departureDate && styles.inputError]}
                        onPress={() => setShowDeparture(true)}
                      >
                        <Ionicons name="calendar-outline" size={15} color={T.textMuted} />
                        <Text
                          style={[
                            form.departureDate
                              ? styles.pickerBtnText
                              : styles.pickerBtnPlaceholder,
                            { marginLeft: 6, flex: 1 },
                          ]}
                        >
                          {form.departureDate || cg.fieldDeparturePlaceholder}
                        </Text>
                      </Pressable>
                    </Field>
                  </View>
                </View>
                {form.requestedServices.length > 0 && (
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>{cg.fieldServices}</Text>
                    <View style={styles.summaryChips}>
                      {form.requestedServices.map((code) => (
                        <View key={code} style={styles.summaryChip}>
                          <Text style={styles.summaryChipText}>
                            {cg.serviceLabels[code] ?? code}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {mutation.isError && (
              <Text style={styles.footerError}>
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "An error occurred"}
              </Text>
            )}
            <Pressable
              style={[
                styles.submitBtn,
                (!canAdvance || mutation.isPending) && styles.submitBtnDisabled,
              ]}
              onPress={goNext}
              disabled={!canAdvance || mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>{primaryLabel}</Text>
                  {!isLastStep ? (
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  ) : (
                    <Ionicons name="person-add-outline" size={18} color="#fff" />
                  )}
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}

      <NationalityPickerModal
        visible={showNationality}
        labels={cg}
        onSelect={(code, name, flag) => {
          setField("nationalityCode", code);
          setField("nationality", name);
          setField("nationalityFlag", flag);
        }}
        onClose={() => setShowNationality(false)}
      />

      <DatePickerModal
        visible={showArrival}
        value={form.arrivalDate}
        title={cg.fieldArrivalDate}
        onConfirm={(d) => {
          setField("arrivalDate", d);
          setShowArrival(false);
        }}
        onClose={() => setShowArrival(false)}
      />

      <DatePickerModal
        visible={showDeparture}
        value={form.departureDate}
        title={cg.fieldDepartureDate}
        minDate={form.arrivalDate || undefined}
        onConfirm={(d) => {
          setField("departureDate", d);
          setShowDeparture(false);
        }}
        onClose={() => setShowDeparture(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    ...Platform.select({ web: { paddingTop: 24 } }),
  },
  headerTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    color: T.text,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.border,
  },
  progressDotActive: { backgroundColor: T.primary, width: 24 },
  progressText: {
    marginLeft: "auto",
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    color: T.textMuted,
  },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  stepTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    color: T.text,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: T.textMuted,
    marginBottom: 20,
    lineHeight: 20,
  },
  field: { marginBottom: 14 },
  fieldLabelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  fieldLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    color: T.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  required: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 12, color: T.danger },
  input: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: T.text,
  },
  inputError: { borderColor: T.danger },
  inlineError: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.danger,
    marginTop: 6,
  },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerBtnText: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 15, color: T.text },
  pickerBtnPlaceholder: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: T.textMuted,
    flex: 1,
  },
  dateRow: { flexDirection: "row", gap: 10 },
  serviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  serviceCard: {
    width: "47%",
    minHeight: 100,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
    gap: 8,
  },
  serviceCardActive: {
    borderColor: T.primary,
    backgroundColor: T.primary + "08",
  },
  serviceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceCardLabel: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
    color: T.text,
    flex: 1,
  },
  serviceCardLabelActive: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: T.primary,
  },
  serviceCheck: { position: "absolute", top: 10, right: 10 },
  summaryCard: {
    marginTop: 8,
    backgroundColor: T.surfaceSubtle,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
  },
  summaryLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  summaryChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  summaryChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: T.primary + "12",
    borderWidth: 1,
    borderColor: T.primary + "30",
  },
  summaryChipText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    color: T.primary,
  },
  footer: {
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "web" ? 34 : 28,
    ...cardShadow,
  },
  footerError: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: T.danger,
    textAlign: "center",
    marginBottom: 8,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: T.primary,
    borderRadius: 12,
    height: 52,
  },
  submitBtnDisabled: { backgroundColor: T.border },
  submitBtnText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  successRoot: { flex: 1, backgroundColor: T.bg },
  successBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  successName: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 22,
    color: T.text,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  successSubtitle: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: T.textMuted,
    marginBottom: 28,
  },
  keyCard: {
    width: "100%",
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 20,
    ...cardShadow,
  },
  keyLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    color: T.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  keyRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  keyValue: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 22,
    color: T.primary,
    letterSpacing: 1.5,
    flex: 1,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: T.primary + "12",
    borderWidth: 1,
    borderColor: T.primary + "30",
  },
  copyBtnText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: T.primary,
  },
  keyHint: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
    lineHeight: 17,
  },
  openGuestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: T.primary,
    borderRadius: 12,
    height: 52,
    width: "100%",
    marginBottom: 12,
  },
  openGuestBtnText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  doneBtn: {
    height: 48,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  doneBtnText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 15,
    color: T.text,
  },
});
