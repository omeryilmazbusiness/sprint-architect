import React, { useRef, useState } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { T, cardShadow } from "@/constants/adminTheme";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, SectionHeader, PrimaryButton } from "@/components/ui";
import { createClinic } from "@/lib/api/adminClinics";
import { SERVICES } from "@/constants/services";

const CURRENCIES = ["EUR", "USD", "TRY", "GBP"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(fields: {
  name: string;
  contactEmail: string;
  billingEmail: string;
  services: string[];
  billingUnitPrice: string;
  websiteUrl: string;
}) {
  const errors: Partial<Record<keyof typeof fields, string>> = {};
  if (!fields.name.trim()) errors.name = "Clinic name is required";
  else if (fields.name.trim().length < 2) errors.name = "Name must be at least 2 characters";
  if (fields.contactEmail && !EMAIL_RE.test(fields.contactEmail.trim()))
    errors.contactEmail = "Invalid email address";
  if (fields.billingEmail && !EMAIL_RE.test(fields.billingEmail.trim()))
    errors.billingEmail = "Invalid billing email";
  if (fields.services.length === 0) errors.services = "Select at least one service";
  if (fields.billingUnitPrice && isNaN(Number(fields.billingUnitPrice)))
    errors.billingUnitPrice = "Must be a number";
  if (
    fields.websiteUrl &&
    !/^https?:\/\/.+\..+/.test(fields.websiteUrl.trim())
  )
    errors.websiteUrl = "Enter a valid URL (https://...)";
  return errors;
}

export default function CreateClinicScreen() {
  const qc = useQueryClient();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [billingEmail, setBillingEmail] = useState("");
  const [billingUnitPrice, setBillingUnitPrice] = useState("");
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("EUR");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const addressRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
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

  function toggleService(code: string) {
    setSelectedServices((prev) => {
      const next = prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code];
      if (submitted) validateAndSet({ services: next });
      return next;
    });
  }

  function validateAndSet(overrides?: Partial<Parameters<typeof validate>[0]>) {
    const errs = validate({
      name,
      contactEmail,
      billingEmail,
      services: selectedServices,
      billingUnitPrice,
      websiteUrl,
      ...overrides,
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    setSubmitted(true);
    if (!validateAndSet()) return;

    const price = billingUnitPrice ? parseFloat(billingUnitPrice) : undefined;
    mutation.mutate({
      name: name.trim(),
      address: address.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      websiteUrl: websiteUrl.trim() || undefined,
      billingEmail: billingEmail.trim() || undefined,
      services: selectedServices,
      billingUnitPrice: price ?? null,
      currency,
      notes: notes.trim() || undefined,
    });
  }

  function FieldError({ field }: { field: string }) {
    if (!errors[field]) return null;
    return <Text style={styles.fieldError}>{errors[field]}</Text>;
  }

  function Field({
    label,
    required,
    children,
  }: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
  }) {
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        {children}
      </View>
    );
  }

  function InputBox({
    value,
    onChangeText,
    placeholder,
    keyboardType,
    autoCapitalize,
    returnKeyType,
    onSubmitEditing,
    ref: inputRef,
    multiline,
    errorKey,
    testID,
  }: {
    value: string;
    onChangeText: (t: string) => void;
    placeholder: string;
    keyboardType?: TextInput["props"]["keyboardType"];
    autoCapitalize?: TextInput["props"]["autoCapitalize"];
    returnKeyType?: TextInput["props"]["returnKeyType"];
    onSubmitEditing?: () => void;
    ref?: React.RefObject<TextInput>;
    multiline?: boolean;
    errorKey?: string;
    testID?: string;
  }) {
    const hasError = errorKey && !!errors[errorKey];
    return (
      <TextInput
        ref={inputRef}
        testID={testID}
        style={[styles.input, multiline && styles.inputMulti, hasError && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "words"}
        returnKeyType={returnKeyType ?? "next"}
        onSubmitEditing={onSubmitEditing}
        multiline={multiline}
        blurOnSubmit={!multiline}
      />
    );
  }

  return (
    <View style={styles.root}>
      <AdminHeader title="New Clinic" backButton onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 80 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── A. Clinic Info ─────────────────────────────── */}
          <SectionHeader label="Clinic Info" />
          <Card style={styles.card}>
            <Field label="Clinic Name" required>
              <TextInput
                testID="clinic-name-input"
                style={[styles.input, errors.name ? styles.inputError : undefined]}
                value={name}
                onChangeText={(v) => { setName(v); if (submitted) validateAndSet({ name: v }); }}
                placeholder="e.g. Istanbul Medical Center"
                placeholderTextColor={T.textMuted}
                returnKeyType="next"
                onSubmitEditing={() => addressRef.current?.focus()}
                autoCapitalize="words"
              />
              <FieldError field="name" />
            </Field>

            <Field label="Address">
              <TextInput
                ref={addressRef}
                testID="clinic-address-input"
                style={[styles.input, styles.inputMulti]}
                value={address}
                onChangeText={setAddress}
                placeholder="Street, district, city, country"
                placeholderTextColor={T.textMuted}
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
                multiline
                autoCapitalize="words"
              />
              <FieldError field="address" />
            </Field>
          </Card>

          {/* ── B. Contact ─────────────────────────────────── */}
          <SectionHeader label="Contact" style={styles.sectionGap} />
          <Card style={styles.card}>
            <Field label="Phone">
              <InputBox
                ref={phoneRef}
                testID="clinic-phone-input"
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder="+90 5XX XXX XXXX"
                keyboardType="phone-pad"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                errorKey="contactPhone"
              />
            </Field>

            <Field label="Contact Email">
              <InputBox
                ref={emailRef}
                testID="clinic-email-input"
                value={contactEmail}
                onChangeText={(v) => { setContactEmail(v); if (submitted) validateAndSet({ contactEmail: v }); }}
                placeholder="contact@clinic.com"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => websiteRef.current?.focus()}
                errorKey="contactEmail"
              />
              <FieldError field="contactEmail" />
            </Field>

            <Field label="Website">
              <InputBox
                ref={websiteRef}
                testID="clinic-website-input"
                value={websiteUrl}
                onChangeText={(v) => { setWebsiteUrl(v); if (submitted) validateAndSet({ websiteUrl: v }); }}
                placeholder="https://clinic.com"
                keyboardType="url"
                autoCapitalize="none"
                returnKeyType="done"
                errorKey="websiteUrl"
              />
              <FieldError field="websiteUrl" />
            </Field>
          </Card>

          {/* ── C. Services ────────────────────────────────── */}
          <SectionHeader label="Services Offered" style={styles.sectionGap} />
          <Card style={styles.card}>
            <Text style={styles.sectionHint}>Select all services this clinic provides</Text>
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
                    <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                      {svc.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <FieldError field="services" />
          </Card>

          {/* ── D. Billing ─────────────────────────────────── */}
          <SectionHeader label="Billing" style={styles.sectionGap} />
          <Card style={styles.card}>
            <Field label="Billing Email">
              <InputBox
                ref={billingEmailRef}
                testID="clinic-billing-email-input"
                value={billingEmail}
                onChangeText={(v) => { setBillingEmail(v); if (submitted) validateAndSet({ billingEmail: v }); }}
                placeholder="billing@clinic.com (defaults to contact email)"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => priceRef.current?.focus()}
                errorKey="billingEmail"
              />
              <FieldError field="billingEmail" />
            </Field>

            <Field label="Unit Price per Patient">
              <InputBox
                ref={priceRef}
                testID="clinic-unit-price-input"
                value={billingUnitPrice}
                onChangeText={(v) => { setBillingUnitPrice(v); if (submitted) validateAndSet({ billingUnitPrice: v }); }}
                placeholder="e.g. 250"
                keyboardType="decimal-pad"
                autoCapitalize="none"
                returnKeyType="done"
                errorKey="billingUnitPrice"
              />
              <FieldError field="billingUnitPrice" />
            </Field>

            <Field label="Currency">
              <View style={styles.currencyRow}>
                {CURRENCIES.map((cur) => (
                  <Pressable
                    key={cur}
                    style={[styles.currencyChip, currency === cur && styles.currencyChipActive]}
                    onPress={() => setCurrency(cur)}
                  >
                    <Text style={[styles.currencyText, currency === cur && styles.currencyTextActive]}>
                      {cur}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Field>
          </Card>

          {/* ── E. Notes ───────────────────────────────────── */}
          <SectionHeader label="Notes" style={styles.sectionGap} />
          <Card style={styles.card}>
            <InputBox
              ref={notesRef}
              value={notes}
              onChangeText={setNotes}
              placeholder="Internal notes about this clinic (optional)"
              multiline
            />
          </Card>

          {/* ── Submit ─────────────────────────────────────── */}
          <View style={styles.actions}>
            <PrimaryButton
              label="Create Clinic"
              loading={mutation.isPending}
              onPress={handleSubmit}
              icon="business-outline"
              style={styles.submitBtn}
            />
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 4 },
  sectionGap: { marginTop: 20 },
  card: { gap: 0 },

  field: { gap: 6, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: T.textSec },
  required: { color: T.danger },
  fieldError: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.danger, marginTop: 2 },

  input: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: T.text,
    paddingVertical: Platform.OS === "ios" ? 6 : 4,
    minHeight: 36,
  },
  inputMulti: { minHeight: 64, textAlignVertical: "top" },
  inputError: { color: T.text },

  sectionHint: { fontFamily: "Inter_400Regular", fontSize: 13, color: T.textSec, marginBottom: 14, paddingTop: 8 },
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
