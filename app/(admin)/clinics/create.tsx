import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  TextStyle,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { T } from "@/constants/adminTheme";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, SectionHeader, PrimaryButton } from "@/components/ui";
import { createClinic } from "@/lib/api/adminClinics";
import { SERVICES } from "@/constants/services";
import { PhonePickerInput, PhonePickerValue } from "@/components/forms/PhonePickerInput";
import { useT } from "@/hooks/useT";
import type { AdminClinicsDict } from "@/i18n/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = ["EUR", "USD", "TRY", "GBP"] as const;
type Currency = (typeof CURRENCIES)[number];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Validation ───────────────────────────────────────────────────────────────

type FormFields = {
  name: string;
  contactEmail: string;
  billingEmail: string;
  services: string[];
  billingUnitPrice: string;
  websiteUrl: string;
};

function validate(
  fields: FormFields,
  tc: AdminClinicsDict,
): Partial<Record<keyof FormFields, string>> {
  const errors: Partial<Record<keyof FormFields, string>> = {};
  if (!fields.name.trim()) errors.name = tc.nameRequired;
  else if (fields.name.trim().length < 2) errors.name = tc.nameMinLength;
  if (fields.contactEmail && !EMAIL_RE.test(fields.contactEmail.trim()))
    errors.contactEmail = tc.invalidEmail;
  if (fields.billingEmail && !EMAIL_RE.test(fields.billingEmail.trim()))
    errors.billingEmail = tc.invalidBillingEmail;
  if (fields.services.length === 0) errors.services = tc.servicesRequired;
  if (fields.billingUnitPrice && isNaN(Number(fields.billingUnitPrice)))
    errors.billingUnitPrice = tc.priceMustBeNumber;
  if (fields.websiteUrl && !/^https?:\/\/.+\..+/.test(fields.websiteUrl.trim()))
    errors.websiteUrl = tc.invalidUrl;
  return errors;
}

// ─── Module-level helper components ───────────────────────────────────────────
// IMPORTANT: These MUST be at module level (not inside CreateClinicScreen).
// Defining them inside the parent component means a new function reference is
// created on every render → React treats it as a new component type →
// TextInputs unmount/remount → keyboard focus is lost after each keystroke.

function FieldLabel({
  label,
  required,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
  );
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <Text style={styles.fieldError}>{error}</Text>;
}

function Field({
  label,
  required,
  children,
  style,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.field, style]}>
      <FieldLabel label={label} required={required} />
      {children}
    </View>
  );
}

type InputBoxProps = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: TextInput["props"]["keyboardType"];
  autoCapitalize?: TextInput["props"]["autoCapitalize"];
  returnKeyType?: TextInput["props"]["returnKeyType"];
  onSubmitEditing?: () => void;
  multiline?: boolean;
  hasError?: boolean;
  testID?: string;
};

const InputBox = React.forwardRef<TextInput, InputBoxProps>(
  (
    {
      value,
      onChangeText,
      placeholder,
      keyboardType,
      autoCapitalize = "words",
      returnKeyType = "next",
      onSubmitEditing,
      multiline,
      hasError,
      testID,
    },
    ref,
  ) => {
    return (
      <TextInput
        ref={ref}
        testID={testID}
        style={[
          styles.input,
          multiline ? styles.inputMulti : undefined,
          hasError ? styles.inputError : undefined,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        multiline={multiline}
        blurOnSubmit={!multiline}
      />
    );
  },
);

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateClinicScreen() {
  const t = useT();
  const tc = t.adminClinics;
  const qc = useQueryClient();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState<PhonePickerValue>({ raw: "", e164: null, countryCode: "TR" });
  const [contactEmail, setContactEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [billingEmail, setBillingEmail] = useState("");
  const [billingUnitPrice, setBillingUnitPrice] = useState("");
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const addressRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const websiteRef = useRef<TextInput>(null);
  const billingEmailRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

  const mutation = useMutation({
    mutationFn: createClinic,
    onSuccess: (clinic) => {
      qc.invalidateQueries({ queryKey: ["/v1/admin/clinics"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/metrics"] });
      router.replace({ pathname: "/(admin)/clinics/[id]", params: { id: clinic.id } });
    },
    onError: (err: any) => {
      const msg = err.message ?? "Failed to create clinic";
      if (msg.includes("email")) {
        Alert.alert("Invalid Email", "Please check the email addresses and try again.");
      } else if (msg.includes("VALIDATION") || msg.includes("400")) {
        Alert.alert("Validation Error", "Please check all fields and try again.");
      } else {
        Alert.alert("Error", msg);
      }
    },
  });

  function runValidation(overrides?: Partial<FormFields>) {
    const errs = validate(
      {
        name,
        contactEmail,
        billingEmail,
        services: selectedServices,
        billingUnitPrice,
        websiteUrl,
        ...overrides,
      },
      tc,
    );
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const toggleService = useCallback(
    (code: string) => {
      setSelectedServices((prev) => {
        const next = prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code];
        if (submitted) {
          const errs = validate(
            {
              name,
              contactEmail,
              billingEmail,
              services: next,
              billingUnitPrice,
              websiteUrl,
            },
            tc,
          );
          setErrors(errs);
        }
        return next;
      });
    },
    [submitted, name, contactEmail, billingEmail, billingUnitPrice, websiteUrl, tc],
  );

  function handleSubmit() {
    setSubmitted(true);
    if (!runValidation()) return;

    const price = billingUnitPrice ? parseFloat(billingUnitPrice) : undefined;
    const phoneStored = phone.e164 ?? (phone.raw.trim() ? phone.raw.trim() : undefined);
    mutation.mutate({
      name: name.trim(),
      address: address.trim() || undefined,
      contactPhone: phoneStored || undefined,
      contactEmail: contactEmail.trim() || undefined,
      websiteUrl: websiteUrl.trim() || undefined,
      billingEmail: billingEmail.trim() || undefined,
      services: selectedServices,
      billingUnitPrice: price ?? null,
      currency,
      notes: notes.trim() || undefined,
    });
  }

  const handleNameChange = useCallback(
    (v: string) => {
      setName(v);
      if (submitted) runValidation({ name: v });
    },
    [submitted, contactEmail, billingEmail, selectedServices, billingUnitPrice, websiteUrl],
  );

  const handleEmailChange = useCallback(
    (v: string) => {
      setContactEmail(v);
      if (submitted) runValidation({ contactEmail: v });
    },
    [submitted, name, billingEmail, selectedServices, billingUnitPrice, websiteUrl],
  );

  const handleWebsiteChange = useCallback(
    (v: string) => {
      setWebsiteUrl(v);
      if (submitted) runValidation({ websiteUrl: v });
    },
    [submitted, name, contactEmail, billingEmail, selectedServices, billingUnitPrice],
  );

  const handleBillingEmailChange = useCallback(
    (v: string) => {
      setBillingEmail(v);
      if (submitted) runValidation({ billingEmail: v });
    },
    [submitted, name, contactEmail, selectedServices, billingUnitPrice, websiteUrl],
  );

  const handlePriceChange = useCallback(
    (v: string) => {
      setBillingUnitPrice(v);
      if (submitted) runValidation({ billingUnitPrice: v });
    },
    [submitted, name, contactEmail, billingEmail, selectedServices, websiteUrl],
  );

  const focusAddress = useCallback(() => addressRef.current?.focus(), []);
  const focusEmail = useCallback(() => emailRef.current?.focus(), []);
  const focusWebsite = useCallback(() => websiteRef.current?.focus(), []);
  const focusBillingEmail = useCallback(() => billingEmailRef.current?.focus(), []);
  const focusPrice = useCallback(() => priceRef.current?.focus(), []);

  return (
    <View style={styles.root}>
      <AdminHeader title={tc.createTitle} backButton onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 80 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── A. Clinic Info ─────────────────────────────── */}
          <SectionHeader label={tc.clinicInfoSection} />
          <Card style={styles.card}>
            <Field label={tc.clinicNameLabel} required>
              <TextInput
                testID="clinic-name-input"
                style={[styles.input, errors.name ? styles.inputError : undefined]}
                value={name}
                onChangeText={handleNameChange}
                placeholder={tc.clinicNamePlaceholder}
                placeholderTextColor={T.textMuted}
                returnKeyType="next"
                onSubmitEditing={focusAddress}
                autoCapitalize="words"
              />
              <FieldError error={errors.name} />
            </Field>

            <Field label={tc.addressLabel} style={styles.fieldLast}>
              <TextInput
                ref={addressRef}
                testID="clinic-address-input"
                style={[styles.input, styles.inputMulti]}
                value={address}
                onChangeText={setAddress}
                placeholder={tc.addressPlaceholder}
                placeholderTextColor={T.textMuted}
                returnKeyType="next"
                onSubmitEditing={focusEmail}
                multiline
                autoCapitalize="words"
              />
            </Field>
          </Card>

          {/* ── B. Contact ─────────────────────────────────── */}
          <SectionHeader label={tc.contactSection} style={styles.sectionGap} />
          <Card style={styles.card}>
            <Field label={tc.phoneLabel}>
              <PhonePickerInput
                testID="clinic-phone-input"
                value={phone}
                onChange={setPhone}
              />
            </Field>

            <Field label={tc.contactEmailLabel}>
              <InputBox
                ref={emailRef}
                testID="clinic-email-input"
                value={contactEmail}
                onChangeText={handleEmailChange}
                placeholder="contact@clinic.com"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={focusWebsite}
                hasError={!!errors.contactEmail}
              />
              <FieldError error={errors.contactEmail} />
            </Field>

            <Field label={tc.websiteLabel} style={styles.fieldLast}>
              <InputBox
                ref={websiteRef}
                testID="clinic-website-input"
                value={websiteUrl}
                onChangeText={handleWebsiteChange}
                placeholder="https://clinic.com"
                keyboardType="url"
                autoCapitalize="none"
                returnKeyType="done"
                hasError={!!errors.websiteUrl}
              />
              <FieldError error={errors.websiteUrl} />
            </Field>
          </Card>

          {/* ── C. Services ────────────────────────────────── */}
          <SectionHeader label={tc.servicesSection} style={styles.sectionGap} />
          <Card style={styles.card}>
            <Text style={styles.sectionHint}>{tc.servicesHint}</Text>
            <View style={styles.chipsRow}>
              {SERVICES.map((svc) => {
                const active = selectedServices.includes(svc.code);
                return (
                  <Pressable
                    key={svc.code}
                    testID={`service-chip-${svc.code}`}
                    style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                    onPress={() => toggleService(svc.code)}
                  >
                    {active && <Ionicons name="checkmark" size={13} color="#fff" />}
                    <Text
                      style={[
                        styles.chipText,
                        active ? styles.chipTextActive : styles.chipTextInactive,
                      ]}
                    >
                      {svc.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <FieldError error={errors.services} />
          </Card>

          {/* ── D. Billing ─────────────────────────────────── */}
          <SectionHeader label={tc.billingSection} style={styles.sectionGap} />
          <Card style={styles.card}>
            <Field label={tc.billingEmailLabel}>
              <InputBox
                ref={billingEmailRef}
                testID="clinic-billing-email-input"
                value={billingEmail}
                onChangeText={handleBillingEmailChange}
                placeholder={tc.billingEmailPlaceholder}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={focusPrice}
                hasError={!!errors.billingEmail}
              />
              <FieldError error={errors.billingEmail} />
            </Field>

            <Field label={tc.unitPriceLabel}>
              <InputBox
                ref={priceRef}
                testID="clinic-unit-price-input"
                value={billingUnitPrice}
                onChangeText={handlePriceChange}
                placeholder={tc.unitPricePlaceholder}
                keyboardType="decimal-pad"
                autoCapitalize="none"
                returnKeyType="done"
                hasError={!!errors.billingUnitPrice}
              />
              <FieldError error={errors.billingUnitPrice} />
            </Field>

            <Field label={tc.currencyLabel} style={styles.fieldLast}>
              <View style={styles.currencyRow}>
                {CURRENCIES.map((cur) => (
                  <Pressable
                    key={cur}
                    style={[styles.currencyChip, currency === cur && styles.currencyChipActive]}
                    onPress={() => setCurrency(cur)}
                  >
                    <Text
                      style={[
                        styles.currencyText,
                        currency === cur && styles.currencyTextActive,
                      ]}
                    >
                      {cur}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Field>
          </Card>

          {/* ── E. Notes ───────────────────────────────────── */}
          <SectionHeader label={tc.notesSection} style={styles.sectionGap} />
          <Card style={styles.card}>
            <TextInput
              ref={notesRef}
              style={[styles.input, styles.inputMulti]}
              value={notes}
              onChangeText={setNotes}
              placeholder={tc.notesPlaceholder}
              placeholderTextColor={T.textMuted}
              multiline
              returnKeyType="default"
              autoCapitalize="sentences"
            />
          </Card>

          {/* ── Submit ─────────────────────────────────────── */}
          <View style={styles.actions}>
            <PrimaryButton
              label={tc.createClinicBtn}
              loading={mutation.isPending}
              onPress={handleSubmit}
              icon="business-outline"
              style={styles.submitBtn}
            />
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelBtnText}>{t.adminInvoices.cancel}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 4 },
  sectionGap: { marginTop: 20 } as TextStyle,
  card: { gap: 0 },

  field: {
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
  },
  fieldLast: { borderBottomWidth: 0 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: T.textSec },
  required: { color: T.danger },
  fieldError: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.danger,
    marginTop: 2,
  },

  input: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: T.text,
    paddingVertical: Platform.OS === "ios" ? 6 : 4,
    minHeight: 36,
  },
  inputMulti: { minHeight: 72, textAlignVertical: "top" },
  inputError: { color: T.text },

  sectionHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    marginBottom: 14,
    paddingTop: 8,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingBottom: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: T.r10,
    borderWidth: 1.5,
  },
  chipActive: { backgroundColor: T.primary, borderColor: T.primary },
  chipInactive: { backgroundColor: T.surface, borderColor: T.border },
  chipText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  chipTextActive: { color: "#fff" },
  chipTextInactive: { color: T.textSec },

  currencyRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", paddingVertical: 4 },
  currencyChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: T.r8,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  currencyChipActive: {
    borderColor: T.accent,
    backgroundColor: T.accent + "12",
  },
  currencyText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: T.textSec },
  currencyTextActive: { color: T.accent },

  actions: { marginTop: 28, gap: 12 },
  submitBtn: { width: "100%" },
  cancelBtn: { alignItems: "center", paddingVertical: 14 },
  cancelBtnText: { fontFamily: "Inter_500Medium", fontSize: 15, color: T.textSec },
});
