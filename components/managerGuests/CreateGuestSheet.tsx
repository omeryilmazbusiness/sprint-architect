import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Platform,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { PhonePickerInput, type PhonePickerValue } from "@/components/forms/PhonePickerInput";
import { DatePickerModal } from "@/components/manager/DatePickerModal";
import { COUNTRIES } from "@/services/phoneFormatter";
import { apiRequest } from "@/lib/query-client";

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICES = [
  "Dental", "Eye Surgery", "Rhinoplasty", "Hair Transplant",
  "Plastic Surgery", "Orthopedic", "Cardiac", "IVF / Fertility",
  "Weight Loss Surgery", "Oncology", "Other",
] as const;

const GENDERS = ["Male", "Female", "Other"] as const;

const COMPANION_RELATIONS = ["Spouse", "Family", "Friend", "Caregiver", "Other"] as const;

const EMPTY_PHONE: PhonePickerValue = { raw: "", e164: null, countryCode: "TR" };

// ─── Sub-components (module-level to prevent focus loss) ─────────────────────

type CountryPickerProps = {
  visible: boolean;
  onSelect: (code: string, name: string, flag: string) => void;
  onClose: () => void;
};

function NationalityPickerModal({ visible, onSelect, onClose }: CountryPickerProps) {
  const [search, setSearch] = useState("");
  const filtered = search.trim()
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()))
    : COUNTRIES;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={pickerStyles.root}>
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.title}>Nationality</Text>
          <Pressable onPress={() => { onClose(); setSearch(""); }} hitSlop={12}>
            <Ionicons name="close" size={22} color={T.text} />
          </Pressable>
        </View>
        <View style={pickerStyles.searchRow}>
          <Ionicons name="search-outline" size={15} color={T.textMuted} />
          <TextInput
            style={pickerStyles.searchInput}
            placeholder="Search country..."
            placeholderTextColor={T.textMuted}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={15} color={T.textMuted} />
            </Pressable>
          )}
        </View>
        <FlatList
          data={filtered}
          keyExtractor={c => c.code}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: c }) => (
            <Pressable
              style={({ pressed }) => [pickerStyles.row, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => { onSelect(c.code, c.name, c.flag); onClose(); setSearch(""); }}
            >
              <Text style={pickerStyles.flag}>{c.flag}</Text>
              <Text style={pickerStyles.countryName}>{c.name}</Text>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 0.5, backgroundColor: T.border, marginLeft: 52 }} />}
        />
      </View>
    </Modal>
  );
}

type ServicesPickerProps = {
  visible: boolean;
  selected: string[];
  onConfirm: (services: string[]) => void;
  onClose: () => void;
};

function ServicesPickerModal({ visible, selected, onConfirm, onClose }: ServicesPickerProps) {
  const [draft, setDraft] = useState<string[]>(selected);

  React.useEffect(() => {
    if (visible) setDraft(selected);
  }, [visible]);

  function toggle(s: string) {
    setDraft(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={pickerStyles.root}>
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.title}>Requested Services</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={T.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {SERVICES.map((s) => {
            const active = draft.includes(s);
            return (
              <Pressable
                key={s}
                style={({ pressed }) => [pickerStyles.row, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => toggle(s)}
              >
                <View style={[pickerStyles.serviceIcon, { backgroundColor: active ? T.primary + "15" : T.surfaceSubtle }]}>
                  <Ionicons
                    name={active ? "checkmark-circle" : "medical-outline"}
                    size={18}
                    color={active ? T.primary : T.textMuted}
                  />
                </View>
                <Text style={[pickerStyles.serviceLabel, active && { color: T.primary, fontFamily: "PlusJakartaSans_600SemiBold" as any }]}>
                  {s}
                </Text>
                {active && <Ionicons name="checkmark" size={18} color={T.primary} />}
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={pickerStyles.confirmRow}>
          <Pressable
            style={[pickerStyles.confirmBtn, draft.length === 0 && pickerStyles.confirmBtnDisabled]}
            onPress={() => { onConfirm(draft); onClose(); }}
            disabled={draft.length === 0}
          >
            <Text style={pickerStyles.confirmBtnText}>
              {draft.length === 0 ? "Select at least one" : `Confirm ${draft.length} service${draft.length > 1 ? "s" : ""}`}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  nationalityCode: string;
  nationality: string;
  nationalityFlag: string;
  passportNo: string;
  phone: PhonePickerValue;
  email: string;
  companionName: string;
  companionPhone: PhonePickerValue;
  companionRelation: string;
  arrivalDate: string;
  departureDate: string;
  arrivalAirport: string;
  flightNumber: string;
  requestedServices: string[];
  notes: string;
}

const EMPTY_FORM: FormState = {
  fullName: "",
  dateOfBirth: "",
  gender: "",
  nationalityCode: "",
  nationality: "",
  nationalityFlag: "",
  passportNo: "",
  phone: EMPTY_PHONE,
  email: "",
  companionName: "",
  companionPhone: EMPTY_PHONE,
  companionRelation: "",
  arrivalDate: "",
  departureDate: "",
  arrivalAirport: "",
  flightNumber: "",
  requestedServices: [],
  notes: "",
};

export type CreateGuestSheetProps = {
  visible: boolean;
  onClose: () => void;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function CreateGuestSheet({ visible, onClose }: CreateGuestSheetProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [companionOpen, setCompanionOpen] = useState(false);
  const [showNationality, setShowNationality] = useState(false);
  const [showDOB, setShowDOB] = useState(false);
  const [showService, setShowService] = useState(false);
  const [showArrival, setShowArrival] = useState(false);
  const [showDeparture, setShowDeparture] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [createdPatient, setCreatedPatient] = useState<{ id: string; patientKey: string; fullName: string } | null>(null);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }, []);

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.fullName.trim()) errs.fullName = "Full name is required";
    if (!form.nationalityCode) errs.nationality = "Nationality is required";
    if (!form.phone.e164) errs.phone = "Valid phone number is required";
    if (!form.arrivalDate) errs.arrivalDate = "Arrival date is required";
    if (!form.departureDate) errs.departureDate = "Departure date is required";
    if (form.arrivalDate && form.departureDate && form.departureDate < form.arrivalDate) {
      errs.departureDate = "Must be on or after arrival";
    }
    if (form.requestedServices.length === 0) errs.requestedServices = "Select at least one service";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "Enter a valid email address";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        fullName: form.fullName.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        nationality: form.nationality,
        nationalityCode: form.nationalityCode,
        passportNo: form.passportNo.trim() || undefined,
        phoneE164: form.phone.e164 ?? undefined,
        phone: form.phone.e164 ?? undefined,
        email: form.email.trim() || undefined,
        emergencyContactName: form.companionName.trim() || undefined,
        emergencyContactPhoneE164: form.companionPhone.e164 ?? undefined,
        companionRelation: form.companionRelation || undefined,
        arrivalDate: form.arrivalDate,
        departureDate: form.departureDate,
        arrivalAirport: form.arrivalAirport.trim() || undefined,
        flightNumber: form.flightNumber.trim() || undefined,
        requestedServices: form.requestedServices,
        notes: form.notes.trim() || undefined,
      };
      const res = await apiRequest("POST", "/v1/manager/patients", body);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? "Failed to create guest");
      }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/patients"], exact: false });
      qc.invalidateQueries({ queryKey: ["/v1/manager/metrics"], exact: false });
      qc.invalidateQueries({ queryKey: ["/v1/manager/dashboard"], exact: false });
      setCreatedPatient({ id: data.id, patientKey: data.patientKey, fullName: data.fullName });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Failed to create guest";
      setErrors(prev => ({ ...prev, fullName: msg }));
    },
  });

  function handleSubmit() {
    if (!validate()) return;
    mutation.mutate();
  }

  function handleClose() {
    setForm(EMPTY_FORM);
    setErrors({});
    setCompanionOpen(false);
    setCreatedPatient(null);
    setCopiedKey(false);
    onClose();
  }

  async function handleCopyKey() {
    if (!createdPatient) return;
    try {
      if (Platform.OS === "web") {
        await (navigator as any).clipboard?.writeText(createdPatient.patientKey);
      } else {
        await Share.share({ message: createdPatient.patientKey, title: "Guest Access Key" });
        return;
      }
    } catch {
      // Clipboard not available — show as copied anyway
    }
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  }

  function handleOpenGuest() {
    if (!createdPatient) return;
    handleClose();
    router.push({ pathname: "/(manager)/patients/[id]", params: { id: createdPatient.id } });
  }

  const isFormValid =
    form.fullName.trim().length > 0 &&
    !!form.nationalityCode &&
    !!form.phone.e164 &&
    !!form.arrivalDate &&
    !!form.departureDate &&
    form.requestedServices.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={handleClose}
    >
      {createdPatient ? (
        // ── Success / Key Reveal ────────────────────────────────────────────
        <View style={styles.successRoot}>
          <View style={styles.successHeader}>
            <View style={{ width: 34 }} />
            <Text style={styles.successHeaderTitle}>Guest Created</Text>
            <Pressable onPress={handleClose} hitSlop={12} testID="create-guest-close-success">
              <Ionicons name="close" size={22} color={T.text} />
            </Pressable>
          </View>

          <View style={styles.successBody}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={64} color={T.success} />
            </View>

            <Text style={styles.successName}>{createdPatient.fullName}</Text>
            <Text style={styles.successSubtitle}>has been added to your clinic</Text>

            <View style={styles.keyCard}>
              <Text style={styles.keyLabel}>GUEST ACCESS KEY</Text>
              <View style={styles.keyRow}>
                <Text style={styles.keyValue} testID="patient-key-value" selectable>
                  {createdPatient.patientKey}
                </Text>
                <Pressable
                  onPress={handleCopyKey}
                  style={({ pressed }) => [styles.copyBtn, { opacity: pressed ? 0.75 : 1 }]}
                  testID="copy-patient-key"
                >
                  <Ionicons
                    name={copiedKey ? "checkmark-circle" : "copy-outline"}
                    size={20}
                    color={copiedKey ? T.success : T.primary}
                  />
                  <Text style={[styles.copyBtnText, copiedKey && { color: T.success }]}>
                    {copiedKey ? "Copied!" : "Copy"}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.keyHint}>
                Share this key with the guest — they'll use it to log into the patient app.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.openGuestBtn, { opacity: pressed ? 0.85 : 1 }]}
              onPress={handleOpenGuest}
              testID="open-guest-btn"
            >
              <Ionicons name="person-outline" size={18} color="#fff" />
              <Text style={styles.openGuestBtnText}>Open Guest Profile</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.doneBtn, { opacity: pressed ? 0.75 : 1 }]}
              onPress={handleClose}
              testID="done-btn"
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        // ── Create Form ─────────────────────────────────────────────────────
        <View style={styles.root}>
          {/* Sticky Header */}
          <View style={styles.header}>
            <Pressable onPress={handleClose} hitSlop={12} testID="create-guest-close">
              <Ionicons name="close" size={22} color={T.text} />
            </Pressable>
            <Text style={styles.headerTitle}>New Guest</Text>
            <View style={{ width: 34 }} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── IDENTITY ─────────────────────────────────────────────── */}
            <SectionHeader title="Identity" icon="person-outline" />

            <Field label="FULL NAME" required error={errors.fullName}>
              <TextInput
                style={[styles.input, !!errors.fullName && styles.inputError]}
                placeholder="e.g. Sarah Mitchell"
                placeholderTextColor={T.textMuted}
                value={form.fullName}
                onChangeText={v => setField("fullName", v)}
                autoCapitalize="words"
                testID="input-fullName"
              />
            </Field>

            <Field label="DATE OF BIRTH">
              <Pressable
                style={styles.pickerBtn}
                onPress={() => setShowDOB(true)}
                testID="btn-dob"
              >
                <Ionicons name="calendar-outline" size={15} color={T.textMuted} />
                <Text style={[form.dateOfBirth ? styles.pickerBtnText : styles.pickerBtnPlaceholder, { marginLeft: 6 }]}>
                  {form.dateOfBirth || "Select date of birth..."}
                </Text>
              </Pressable>
            </Field>

            <Field label="GENDER">
              <View style={styles.chipRow}>
                {GENDERS.map(g => (
                  <Pressable
                    key={g}
                    style={[styles.chip, form.gender === g && styles.chipActive]}
                    onPress={() => setField("gender", form.gender === g ? "" : g)}
                    testID={`chip-gender-${g}`}
                  >
                    <Text style={[styles.chipText, form.gender === g && styles.chipTextActive]}>{g}</Text>
                  </Pressable>
                ))}
              </View>
            </Field>

            <Field label="NATIONALITY" required error={errors.nationality}>
              <Pressable
                style={[styles.pickerBtn, !!errors.nationality && styles.inputError]}
                onPress={() => setShowNationality(true)}
                testID="btn-nationality"
              >
                <Text style={form.nationalityCode ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                  {form.nationalityCode
                    ? `${form.nationalityFlag}  ${form.nationality}`
                    : "Select nationality..."}
                </Text>
                <Ionicons name="chevron-down" size={15} color={T.textMuted} />
              </Pressable>
            </Field>

            <Field label="PASSPORT / ID NO">
              <TextInput
                style={styles.input}
                placeholder="Optional"
                placeholderTextColor={T.textMuted}
                value={form.passportNo}
                onChangeText={v => setField("passportNo", v)}
                autoCapitalize="characters"
                testID="input-passport"
              />
            </Field>

            {/* ── CONTACT ──────────────────────────────────────────────── */}
            <SectionHeader title="Contact" icon="call-outline" />

            <Field label="PHONE" required error={errors.phone}>
              <PhonePickerInput
                value={form.phone}
                onChange={v => setField("phone", v)}
                hasError={!!errors.phone}
                testID="input-phone"
              />
            </Field>

            <Field label="EMAIL">
              <TextInput
                style={[styles.input, !!errors.email && styles.inputError]}
                placeholder="guest@example.com"
                placeholderTextColor={T.textMuted}
                value={form.email}
                onChangeText={v => setField("email", v)}
                keyboardType="email-address"
                autoCapitalize="none"
                testID="input-email"
              />
              {!!errors.email && <Text style={styles.inlineError}>{errors.email}</Text>}
            </Field>

            {/* ── COMPANION ────────────────────────────────────────────── */}
            <Pressable
              style={styles.companionToggle}
              onPress={() => setCompanionOpen(o => !o)}
              testID="toggle-companion"
            >
              <View style={styles.companionToggleLeft}>
                <View style={styles.companionIcon}>
                  <Ionicons name="people-outline" size={16} color={T.primary} />
                </View>
                <Text style={styles.companionToggleLabel}>
                  {companionOpen ? "Companion / 2nd Contact" : "Add Companion / 2nd Contact"}
                </Text>
              </View>
              <Ionicons
                name={companionOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color={T.textMuted}
              />
            </Pressable>

            {companionOpen && (
              <View style={styles.companionSection}>
                <Field label="COMPANION NAME">
                  <TextInput
                    style={styles.input}
                    placeholder="Full name"
                    placeholderTextColor={T.textMuted}
                    value={form.companionName}
                    onChangeText={v => setField("companionName", v)}
                    autoCapitalize="words"
                    testID="input-companionName"
                  />
                </Field>

                <Field label="COMPANION PHONE">
                  <PhonePickerInput
                    value={form.companionPhone}
                    onChange={v => setField("companionPhone", v)}
                    testID="input-companionPhone"
                  />
                </Field>

                <Field label="RELATION">
                  <View style={styles.chipRow}>
                    {COMPANION_RELATIONS.map(r => (
                      <Pressable
                        key={r}
                        style={[styles.chip, form.companionRelation === r && styles.chipActive]}
                        onPress={() => setField("companionRelation", form.companionRelation === r ? "" : r)}
                        testID={`chip-relation-${r}`}
                      >
                        <Text style={[styles.chipText, form.companionRelation === r && styles.chipTextActive]}>{r}</Text>
                      </Pressable>
                    ))}
                  </View>
                </Field>
              </View>
            )}

            {/* ── TRAVEL & SERVICE ─────────────────────────────────────── */}
            <SectionHeader title="Travel & Service" icon="airplane-outline" />

            <Field label="REQUESTED SERVICES" required error={errors.requestedServices}>
              <Pressable
                style={[styles.pickerBtn, !!errors.requestedServices && styles.inputError]}
                onPress={() => setShowService(true)}
                testID="btn-service"
              >
                <Text style={form.requestedServices.length > 0 ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                  {form.requestedServices.length > 0
                    ? `${form.requestedServices.length} service${form.requestedServices.length > 1 ? "s" : ""} selected`
                    : "Select services..."}
                </Text>
                <Ionicons name="chevron-down" size={15} color={T.textMuted} />
              </Pressable>
              {form.requestedServices.length > 0 && (
                <View style={styles.serviceChipRow}>
                  {form.requestedServices.map(s => (
                    <View key={s} style={styles.serviceChip}>
                      <Text style={styles.serviceChipText}>{s}</Text>
                      <Pressable
                        onPress={() => setField("requestedServices", form.requestedServices.filter(x => x !== s))}
                        hitSlop={6}
                      >
                        <Ionicons name="close-circle" size={14} color={T.primary} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </Field>

            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Field label="ARRIVAL DATE" required error={errors.arrivalDate}>
                  <Pressable
                    style={[styles.pickerBtn, !!errors.arrivalDate && styles.inputError]}
                    onPress={() => setShowArrival(true)}
                    testID="btn-arrival"
                  >
                    <Ionicons name="calendar-outline" size={15} color={T.textMuted} />
                    <Text style={[form.arrivalDate ? styles.pickerBtnText : styles.pickerBtnPlaceholder, { marginLeft: 6 }]}>
                      {form.arrivalDate || "Arrival"}
                    </Text>
                  </Pressable>
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="DEPARTURE DATE" required error={errors.departureDate}>
                  <Pressable
                    style={[styles.pickerBtn, !!errors.departureDate && styles.inputError]}
                    onPress={() => setShowDeparture(true)}
                    testID="btn-departure"
                  >
                    <Ionicons name="calendar-outline" size={15} color={T.textMuted} />
                    <Text style={[form.departureDate ? styles.pickerBtnText : styles.pickerBtnPlaceholder, { marginLeft: 6 }]}>
                      {form.departureDate || "Departure"}
                    </Text>
                  </Pressable>
                </Field>
              </View>
            </View>

            <Field label="ARRIVAL AIRPORT">
              <TextInput
                style={styles.input}
                placeholder="e.g. Istanbul (IST)"
                placeholderTextColor={T.textMuted}
                value={form.arrivalAirport}
                onChangeText={v => setField("arrivalAirport", v)}
                testID="input-airport"
              />
            </Field>

            <Field label="FLIGHT NUMBER">
              <TextInput
                style={styles.input}
                placeholder="e.g. TK123"
                placeholderTextColor={T.textMuted}
                value={form.flightNumber}
                onChangeText={v => setField("flightNumber", v)}
                autoCapitalize="characters"
                testID="input-flight"
              />
            </Field>

            {/* ── NOTES ────────────────────────────────────────────────── */}
            <SectionHeader title="Notes" icon="document-text-outline" />

            <Field label="INTERNAL NOTES">
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Add any relevant notes..."
                placeholderTextColor={T.textMuted}
                value={form.notes}
                onChangeText={v => setField("notes", v)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                testID="input-notes"
              />
            </Field>

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Pinned Footer */}
          <View style={styles.footer}>
            {mutation.isError && (
              <Text style={styles.footerError} numberOfLines={2}>
                {mutation.error instanceof Error ? mutation.error.message : "An error occurred"}
              </Text>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                (!isFormValid || mutation.isPending) && styles.submitBtnDisabled,
                { opacity: pressed && isFormValid ? 0.85 : 1 },
              ]}
              onPress={handleSubmit}
              disabled={!isFormValid || mutation.isPending}
              testID="btn-create-guest"
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Create Guest</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Pickers (rendered outside scrollview) ────────────────────── */}
      <NationalityPickerModal
        visible={showNationality}
        onSelect={(code, name, flag) => {
          setField("nationalityCode", code);
          setField("nationality", name);
          setField("nationalityFlag", flag);
          setErrors(e => ({ ...e, nationality: undefined }));
        }}
        onClose={() => setShowNationality(false)}
      />

      <DatePickerModal
        visible={showDOB}
        value={form.dateOfBirth}
        title="Date of Birth"
        maxDate={new Date().toISOString().split("T")[0]}
        onConfirm={d => { setField("dateOfBirth", d); setShowDOB(false); }}
        onClose={() => setShowDOB(false)}
      />

      <ServicesPickerModal
        visible={showService}
        selected={form.requestedServices}
        onConfirm={v => setField("requestedServices", v)}
        onClose={() => setShowService(false)}
      />

      <DatePickerModal
        visible={showArrival}
        value={form.arrivalDate}
        title="Arrival Date"
        onConfirm={d => { setField("arrivalDate", d); setShowArrival(false); }}
        onClose={() => setShowArrival(false)}
      />

      <DatePickerModal
        visible={showDeparture}
        value={form.departureDate}
        title="Departure Date"
        minDate={form.arrivalDate || undefined}
        onConfirm={d => { setField("departureDate", d); setShowDeparture(false); }}
        onClose={() => setShowDeparture(false)}
      />
    </Modal>
  );
}

// ─── Helper sub-components ────────────────────────────────────────────────────

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={15} color={T.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Field({
  label, required, error, children,
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
        {required && <Text style={styles.required}>*</Text>}
      </View>
      {children}
      {!!error && <Text style={styles.inlineError}>{error}</Text>}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    fontFamily: "PlusJakartaSans_700Bold" as any,
    fontSize: 17,
    color: T.text,
  },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  sectionTitle: {
    fontFamily: "PlusJakartaSans_700Bold" as any,
    fontSize: 13,
    color: T.primary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  field: { marginBottom: 14 },
  fieldLabelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  fieldLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 11,
    color: T.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  required: { fontFamily: "PlusJakartaSans_600SemiBold" as any, fontSize: 12, color: T.danger },

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
  inputMultiline: { minHeight: 80, paddingTop: 12 },
  inputError: { borderColor: T.danger },
  inlineError: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.danger,
    marginTop: 4,
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
  pickerBtnText: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 15, color: T.text, flex: 1 },
  pickerBtnPlaceholder: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 15, color: T.textMuted, flex: 1 },

  dateRow: { flexDirection: "row", gap: 10 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  chipActive: { backgroundColor: T.primary + "15", borderColor: T.primary },
  chipText: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 13, color: T.text },
  chipTextActive: { color: T.primary },

  serviceChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  serviceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: T.primary + "12",
    borderWidth: 1,
    borderColor: T.primary + "30",
  },
  serviceChipText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    color: T.primary,
  },

  companionToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 2,
  },
  companionToggleLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  companionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.primary + "12",
    alignItems: "center",
    justifyContent: "center",
  },
  companionToggleLabel: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 14, color: T.text },
  companionSection: {
    backgroundColor: T.surfaceSubtle,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: T.border,
  },

  footer: {
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "web" ? 34 : 28,
    gap: 8,
    ...cardShadow,
  },
  footerError: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: T.danger,
    textAlign: "center",
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
    fontFamily: "PlusJakartaSans_700Bold" as any,
    fontSize: 16,
    color: "#fff",
  },

  // Success screen
  successRoot: { flex: 1, backgroundColor: T.bg },
  successHeader: {
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
  successHeaderTitle: {
    fontFamily: "PlusJakartaSans_700Bold" as any,
    fontSize: 17,
    color: T.text,
  },
  successBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  successIconWrap: {
    marginBottom: 16,
  },
  successName: {
    fontFamily: "PlusJakartaSans_700Bold" as any,
    fontSize: 22,
    color: T.text,
    textAlign: "center",
    marginBottom: 4,
  },
  successSubtitle: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: T.textMuted,
    textAlign: "center",
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
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 11,
    color: T.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  keyValue: {
    fontFamily: "PlusJakartaSans_700Bold" as any,
    fontSize: 24,
    color: T.primary,
    letterSpacing: 2,
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
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
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
    fontFamily: "PlusJakartaSans_700Bold" as any,
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

const pickerStyles = StyleSheet.create({
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
  title: { fontFamily: "PlusJakartaSans_700Bold" as any, fontSize: 17, color: T.text },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: T.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: T.text,
    padding: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 12,
  },
  flag: { fontSize: 22, width: 32, textAlign: "center" },
  countryName: { flex: 1, fontFamily: "PlusJakartaSans_400Regular", fontSize: 15, color: T.text },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceLabel: { flex: 1, fontFamily: "PlusJakartaSans_400Regular", fontSize: 15, color: T.text },
  confirmRow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === "web" ? 34 : 28,
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  confirmBtn: {
    backgroundColor: T.primary,
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDisabled: { backgroundColor: T.border },
  confirmBtnText: {
    fontFamily: "PlusJakartaSans_700Bold" as any,
    fontSize: 16,
    color: "#fff",
  },
});
