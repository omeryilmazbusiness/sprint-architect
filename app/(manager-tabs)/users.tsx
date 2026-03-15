import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  Modal,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { ManagerHeader } from "@/components/manager/ManagerHeader";
import { DatePickerModal } from "@/components/manager/DatePickerModal";
import { StatusPill, Divider } from "@/components/ui";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/context/AuthContext";
import { COUNTRIES, Country, getCountryByCode, detectCountryFromPhone } from "@/constants/countries";
import GuestListCard from "@/components/managerUsers/GuestListCard";
import DoctorListCard from "@/components/managerDoctors/DoctorListCard";
import {
  ManagerFilterSheet,
  type GuestFilterState,
  DEFAULT_GUEST_FILTERS,
} from "@/components/filters/ManagerFilterSheet";
import { ActiveFilterChips, type ActiveChip } from "@/components/filters/ActiveFilterChips";

type TabType = "Guests" | "Doctors";

interface Patient {
  id: string;
  fullName: string;
  patientKey: string;
  phone?: string;
  phoneE164?: string | null;
  email?: string | null;
  nationality?: string;
  nationalityCode?: string;
  arrivalDate?: string | null;
  departureDate?: string | null;
  status: "ACTIVE" | "INACTIVE" | "PENDING" | "APPROVED" | "ENDED";
  createdAt?: string;
  pendingDocCount?: number;
  hasPendingDocs?: boolean;
  hasTodayAppointment?: boolean;
  plan?: {
    hotelId: string | null;
    transportId: string | null;
    doctorId: string | null;
  } | null;
}

interface PatientListResponse {
  items: Patient[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface Doctor {
  id: string;
  fullName: string;
  specialty: string;
  phone: string;
}

interface DoctorListResponse {
  rows: Doctor[];
}

type StatusFilterType = "ALL" | "PENDING" | "APPROVED" | "ENDED" | "ACTIVE" | "INACTIVE";

const STATUS_FILTERS: { label: string; value: StatusFilterType }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Ended", value: "ENDED" },
];

const LANGUAGES = [
  { code: "EN", label: "English" },
  { code: "TR", label: "Turkish" },
  { code: "RU", label: "Russian" },
  { code: "AR", label: "Arabic" },
  { code: "DE", label: "German" },
  { code: "FR", label: "French" },
];

function formatDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SkeletonCard() {
  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.topRow}>
        <View style={skeletonStyles.avatar} />
        <View style={skeletonStyles.lines}>
          <View style={[skeletonStyles.line, { width: "60%" }]} />
          <View style={[skeletonStyles.line, { width: "40%", marginTop: 6 }]} />
        </View>
        <View style={[skeletonStyles.line, { width: 56, height: 20, borderRadius: 10 }]} />
      </View>
      <View style={[skeletonStyles.line, { width: "50%", height: 12 }]} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    borderWidth: 1,
    borderColor: T.border,
    marginHorizontal: T.sp16,
    marginBottom: T.sp12,
    padding: T.sp16,
    gap: 12,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: T.sp12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: T.border },
  lines: { flex: 1, gap: 6 },
  line: { height: 13, backgroundColor: T.border, borderRadius: 6 },
});

function CountryPickerModal({
  visible,
  onSelect,
  onClose,
  title = "Select Country",
}: {
  visible: boolean;
  onSelect: (c: Country) => void;
  onClose: () => void;
  title?: string;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() =>
    search.trim()
      ? COUNTRIES.filter(c =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search) ||
          c.code.toLowerCase().includes(search.toLowerCase()))
      : COUNTRIES,
  [search]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={styles.cpModal}>
        <View style={styles.cpHeader}>
          <Text style={styles.cpTitle}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={T.text} />
          </Pressable>
        </View>
        <View style={styles.cpSearch}>
          <Ionicons name="search-outline" size={16} color={T.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.cpSearchInput}
            placeholder="Search country..."
            placeholderTextColor={T.textMuted}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={T.textMuted} />
            </Pressable>
          )}
        </View>
        <FlatList
          data={filtered}
          keyExtractor={c => c.code}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <Divider inset={16} />}
          renderItem={({ item: c }) => (
            <Pressable
              style={({ pressed }) => [styles.cpRow, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => { onSelect(c); onClose(); setSearch(""); }}
            >
              <Text style={styles.cpFlag}>{c.flag}</Text>
              <Text style={styles.cpName}>{c.name}</Text>
              <Text style={styles.cpDial}>+{c.dialCode}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

interface CreateFormState {
  fullName: string;
  nationalityCountry: Country | null;
  phoneCountry: Country | null;
  phoneLocal: string;
  email: string;
  passportNo: string;
  preferredLanguage: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  arrivalDate: string;
  departureDate: string;
  flightNumber: string;
  arrivalAirport: string;
  requestedService: string;
  notes: string;
}

const EMPTY_FORM: CreateFormState = {
  fullName: "",
  nationalityCountry: null,
  phoneCountry: getCountryByCode("TR") ?? null,
  phoneLocal: "",
  email: "",
  passportNo: "",
  preferredLanguage: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  arrivalDate: "",
  departureDate: "",
  flightNumber: "",
  arrivalAirport: "",
  requestedService: "",
  notes: "",
};

function GuestsTab() {
  const params = useLocalSearchParams<{ openCreate?: string }>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<GuestFilterState>(DEFAULT_GUEST_FILTERS);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [page] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CreateFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const [showNationalityPicker, setShowNationalityPicker] = useState(false);
  const [showPhoneCountryPicker, setShowPhoneCountryPicker] = useState(false);
  const [showArrivalPicker, setShowArrivalPicker] = useState(false);
  const [showDeparturePicker, setShowDeparturePicker] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);

  const qc = useQueryClient();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (params.openCreate === "1") { setShowCreate(true); setStep(1); setForm(EMPTY_FORM); }
  }, [params.openCreate]);

  const { data, isLoading, refetch, isRefetching } = useQuery<PatientListResponse>({
    queryKey: ["/v1/manager/patients", debouncedSearch, filters.status, filters.pendingDocs, filters.todayAppt, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), pageSize: "30" });
      if (debouncedSearch.trim()) p.set("search", debouncedSearch.trim());
      if (filters.status !== "ALL") p.set("status", filters.status);
      if (filters.pendingDocs) p.set("pendingDocs", "true");
      if (filters.todayAppt) p.set("todayAppt", "true");
      const res = await apiRequest("GET", `/v1/manager/patients?${p.toString()}`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const phoneE164 = form.phoneLocal.trim()
        ? form.phoneCountry
          ? `+${form.phoneCountry.dialCode}${form.phoneLocal.replace(/\D/g, "")}`
          : form.phoneLocal.trim()
        : undefined;
      const body = {
        fullName: form.fullName.trim(),
        nationalityCode: form.nationalityCountry?.code,
        nationality: form.nationalityCountry?.name,
        phoneE164,
        phone: phoneE164,
        email: form.email.trim() || undefined,
        passportNo: form.passportNo.trim() || undefined,
        preferredLanguage: form.preferredLanguage || undefined,
        emergencyContactName: form.emergencyContactName.trim() || undefined,
        emergencyContactPhoneE164: form.emergencyContactPhone.trim() || undefined,
        arrivalDate: form.arrivalDate || undefined,
        departureDate: form.departureDate || undefined,
        flightNumber: form.flightNumber.trim() || undefined,
        arrivalAirport: form.arrivalAirport.trim() || undefined,
        requestedService: form.requestedService.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      const res = await apiRequest("POST", "/v1/manager/patients", body);
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/patients"] });
      qc.invalidateQueries({ queryKey: ["/v1/manager/metrics"] });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setStep(1);
      if (data?.id) {
        router.push({ pathname: "/(manager)/patients/[id]", params: { id: data.id } });
      }
    },
    onError: (e: any) => Alert.alert("Error", e.message ?? "Failed to create guest"),
  });

  const handleNext = () => {
    setFormError("");
    if (!form.fullName.trim()) {
      setFormError("Full name is required.");
      return;
    }
    setStep(2);
  };

  const handleCreate = () => {
    setFormError("");
    if (!form.arrivalDate) { setFormError("Arrival date is required."); return; }
    if (!form.departureDate) { setFormError("Departure date is required."); return; }
    if (form.departureDate < form.arrivalDate) {
      setFormError("Departure must be on or after arrival.");
      return;
    }
    createMutation.mutate();
  };

  const handlePhoneChange = (text: string) => {
    setForm(f => ({ ...f, phoneLocal: text }));
    if (text.startsWith("+")) {
      const detected = detectCountryFromPhone(text);
      if (detected) setForm(f => ({ ...f, phoneCountry: detected, phoneLocal: text }));
    }
  };

  const rows = data?.items ?? [];
  const hasActiveFilters =
    filters.status !== "ALL" || filters.pendingDocs || filters.todayAppt;

  function clearAllFilters() {
    setFilters(DEFAULT_GUEST_FILTERS);
  }

  const STATUS_CHIP_LABELS: Record<string, string> = {
    PENDING: "Pending", APPROVED: "Approved", ACTIVE: "Active",
    INACTIVE: "Inactive", ENDED: "Ended",
  };

  const activeChips: ActiveChip[] = [];
  if (filters.status !== "ALL") {
    activeChips.push({
      key: "status",
      label: `Status: ${STATUS_CHIP_LABELS[filters.status] ?? filters.status}`,
      variant: "primary",
      onRemove: () => setFilters((f) => ({ ...f, status: "ALL" })),
    });
  }
  if (filters.pendingDocs) {
    activeChips.push({
      key: "pendingDocs",
      label: "Docs Pending",
      variant: "warn",
      onRemove: () => setFilters((f) => ({ ...f, pendingDocs: false })),
    });
  }
  if (filters.todayAppt) {
    activeChips.push({
      key: "todayAppt",
      label: "Today Appt",
      variant: "accent",
      onRemove: () => setFilters((f) => ({ ...f, todayAppt: false })),
    });
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filterBar}>
        <View style={styles.searchBarRow}>
          <View style={[styles.searchBar, { flex: 1, marginHorizontal: 0, marginBottom: 0 }]}>
            <Ionicons name="search-outline" size={16} color={T.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search guests..."
              placeholderTextColor={T.textMuted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={16} color={T.textMuted} />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={() => setShowFilterSheet(true)}
            style={({ pressed }) => [styles.filterIconBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="options-outline" size={20} color={hasActiveFilters ? T.primary : T.textSec} />
            {hasActiveFilters && <View style={styles.filterDot} />}
          </Pressable>
        </View>
      </View>
      <ActiveFilterChips chips={activeChips} onClearAll={clearAllFilters} />

      {isLoading ? (
        <ScrollView contentContainerStyle={{ paddingTop: T.sp16, paddingBottom: 100 }}>
          {[1, 2, 3, 4].map((k) => <SkeletonCard key={k} />)}
        </ScrollView>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingTop: T.sp12, paddingBottom: bottomPad + 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />}
          ListHeaderComponent={
            data?.totalCount != null ? (
              <Text style={styles.listCount}>
                Guests ({data.totalCount})
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={40} color={T.border} />
              <Text style={styles.emptyTitle}>
                {search || hasActiveFilters ? "No guests found" : "No guests yet"}
              </Text>
              <Text style={styles.emptyText}>
                {search || hasActiveFilters
                  ? "Try adjusting your search or filters"
                  : "Tap the + button to add your first guest"}
              </Text>
              {hasActiveFilters && (
                <Pressable onPress={clearAllFilters} style={styles.clearFiltersBtn}>
                  <Text style={styles.clearFiltersBtnText}>Clear filters</Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <GuestListCard
              patient={item}
              flagEmoji={item.nationalityCode ? getCountryByCode(item.nationalityCode)?.flag ?? null : null}
              onPress={() => router.push({ pathname: "/(manager)/patients/[id]", params: { id: item.id } })}
            />
          )}
        />
      )}

      <Pressable
        style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.85 : 1 }]}
        onPress={() => { setShowCreate(true); setStep(1); setForm(EMPTY_FORM); setFormError(""); }}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>

      <Modal visible={showCreate} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => step === 2 ? setStep(1) : setShowCreate(false)} hitSlop={10}>
              <Ionicons name={step === 2 ? "chevron-back" : "close"} size={24} color={T.text} />
            </Pressable>
            <Text style={styles.modalTitle}>New Guest</Text>
            <View style={styles.stepBadge}>
              <Text style={styles.stepText}>{step} / 2</Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
            <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
            <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {step === 1 ? (
              <>
                <Text style={styles.stepTitle}>Identity & Contact</Text>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>FULL NAME *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. Sarah Mitchell"
                    placeholderTextColor={T.textMuted}
                    value={form.fullName}
                    onChangeText={v => setForm(f => ({ ...f, fullName: v }))}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>NATIONALITY</Text>
                  <Pressable
                    style={styles.pickerBtn}
                    onPress={() => setShowNationalityPicker(true)}
                  >
                    <Text style={form.nationalityCountry ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                      {form.nationalityCountry
                        ? `${form.nationalityCountry.flag}  ${form.nationalityCountry.name}`
                        : "Select country..."}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={T.textMuted} />
                  </Pressable>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>PHONE</Text>
                  <View style={styles.phoneRow}>
                    <Pressable style={styles.dialCodeBtn} onPress={() => setShowPhoneCountryPicker(true)}>
                      <Text style={styles.dialCodeText}>
                        {form.phoneCountry ? `${form.phoneCountry.flag} +${form.phoneCountry.dialCode}` : "+?"}
                      </Text>
                      <Ionicons name="chevron-down" size={13} color={T.textMuted} />
                    </Pressable>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="5XX XXX XX XX"
                      placeholderTextColor={T.textMuted}
                      value={form.phoneLocal}
                      onChangeText={handlePhoneChange}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>EMAIL</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="guest@example.com"
                    placeholderTextColor={T.textMuted}
                    value={form.email}
                    onChangeText={v => setForm(f => ({ ...f, email: v }))}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>PASSPORT NO</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. A12345678"
                    placeholderTextColor={T.textMuted}
                    value={form.passportNo}
                    onChangeText={v => setForm(f => ({ ...f, passportNo: v }))}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>PREFERRED LANGUAGE</Text>
                  <Pressable style={styles.pickerBtn} onPress={() => setShowLangPicker(true)}>
                    <Text style={form.preferredLanguage ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                      {form.preferredLanguage
                        ? LANGUAGES.find(l => l.code === form.preferredLanguage)?.label ?? form.preferredLanguage
                        : "Select language..."}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={T.textMuted} />
                  </Pressable>
                </View>

                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionDividerText}>Emergency Contact (optional)</Text>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>CONTACT NAME</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. John Mitchell"
                    placeholderTextColor={T.textMuted}
                    value={form.emergencyContactName}
                    onChangeText={v => setForm(f => ({ ...f, emergencyContactName: v }))}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>CONTACT PHONE</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="+1 555 000 0000"
                    placeholderTextColor={T.textMuted}
                    value={form.emergencyContactPhone}
                    onChangeText={v => setForm(f => ({ ...f, emergencyContactPhone: v }))}
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.stepTitle}>Travel & Plan</Text>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>ARRIVAL DATE *</Text>
                  <Pressable style={styles.pickerBtn} onPress={() => setShowArrivalPicker(true)}>
                    <Text style={form.arrivalDate ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                      {form.arrivalDate || "Select arrival date..."}
                    </Text>
                    <Ionicons name="calendar-outline" size={16} color={T.textMuted} />
                  </Pressable>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>DEPARTURE DATE *</Text>
                  <Pressable style={styles.pickerBtn} onPress={() => setShowDeparturePicker(true)}>
                    <Text style={form.departureDate ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                      {form.departureDate || "Select departure date..."}
                    </Text>
                    <Ionicons name="calendar-outline" size={16} color={T.textMuted} />
                  </Pressable>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>FLIGHT NUMBER</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. TK 1234"
                    placeholderTextColor={T.textMuted}
                    value={form.flightNumber}
                    onChangeText={v => setForm(f => ({ ...f, flightNumber: v }))}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>ARRIVAL AIRPORT</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. Istanbul Sabiha Gökçen (SAW)"
                    placeholderTextColor={T.textMuted}
                    value={form.arrivalAirport}
                    onChangeText={v => setForm(f => ({ ...f, arrivalAirport: v }))}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>REQUESTED SERVICE</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. Hair Transplant"
                    placeholderTextColor={T.textMuted}
                    value={form.requestedService}
                    onChangeText={v => setForm(f => ({ ...f, requestedService: v }))}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>NOTES</Text>
                  <TextInput
                    style={[styles.fieldInput, { height: 80, textAlignVertical: "top" }]}
                    placeholder="Any additional information..."
                    placeholderTextColor={T.textMuted}
                    value={form.notes}
                    onChangeText={v => setForm(f => ({ ...f, notes: v }))}
                    multiline
                  />
                </View>
              </>
            )}

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          </ScrollView>

          <View style={styles.modalActions}>
            {step === 1 ? (
              <Pressable style={styles.btnPrimary} onPress={handleNext}>
                <Text style={styles.btnPrimaryText}>Next  →</Text>
              </Pressable>
            ) : (
              <>
                <Pressable style={styles.btnSecondary} onPress={() => setStep(1)}>
                  <Text style={styles.btnSecondaryText}>← Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.btnPrimary, { flex: 2, opacity: createMutation.isPending ? 0.75 : 1 }]}
                  onPress={handleCreate}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.btnPrimaryText}>Create Guest</Text>}
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      <CountryPickerModal
        visible={showNationalityPicker}
        onSelect={c => setForm(f => ({ ...f, nationalityCountry: c }))}
        onClose={() => setShowNationalityPicker(false)}
        title="Select Nationality"
      />
      <CountryPickerModal
        visible={showPhoneCountryPicker}
        onSelect={c => setForm(f => ({ ...f, phoneCountry: c }))}
        onClose={() => setShowPhoneCountryPicker(false)}
        title="Phone Country Code"
      />

      <Modal visible={showLangPicker} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowLangPicker(false)}>
        <View style={styles.cpModal}>
          <View style={styles.cpHeader}>
            <Text style={styles.cpTitle}>Preferred Language</Text>
            <Pressable onPress={() => setShowLangPicker(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={T.text} />
            </Pressable>
          </View>
          {LANGUAGES.map((lang, i) => (
            <React.Fragment key={lang.code}>
              {i > 0 && <Divider inset={16} />}
              <Pressable
                style={({ pressed }) => [styles.cpRow, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => { setForm(f => ({ ...f, preferredLanguage: lang.code })); setShowLangPicker(false); }}
              >
                <Text style={styles.cpName}>{lang.label}</Text>
                {form.preferredLanguage === lang.code && <Ionicons name="checkmark" size={18} color={T.primary} />}
              </Pressable>
            </React.Fragment>
          ))}
        </View>
      </Modal>

      <DatePickerModal
        visible={showArrivalPicker}
        value={form.arrivalDate}
        title="Arrival Date"
        onConfirm={(d) => { setForm(f => ({ ...f, arrivalDate: d })); setShowArrivalPicker(false); }}
        onClose={() => setShowArrivalPicker(false)}
      />
      <DatePickerModal
        visible={showDeparturePicker}
        value={form.departureDate}
        title="Departure Date"
        minDate={form.arrivalDate || undefined}
        onConfirm={(d) => { setForm(f => ({ ...f, departureDate: d })); setShowDeparturePicker(false); }}
        onClose={() => setShowDeparturePicker(false)}
      />

      <ManagerFilterSheet
        visible={showFilterSheet}
        current={filters}
        onApply={(f) => setFilters(f)}
        onClose={() => setShowFilterSheet(false)}
      />
    </View>
  );
}

function DoctorsTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const qc = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  }

  const { data, isLoading, refetch, isRefetching } = useQuery<DoctorListResponse | Doctor[]>({
    queryKey: ["/v1/manager/doctors", debouncedSearch],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (debouncedSearch.trim()) p.set("search", debouncedSearch.trim());
      const res = await apiRequest("GET", `/v1/manager/doctors?${p.toString()}`);
      return res.json();
    },
  });

  const rows = useMemo(() => {
    if (!data) return [];
    const all = Array.isArray(data) ? data : (data as DoctorListResponse).rows ?? [];
    return all.filter((d) => !deletedIds.has(d.id));
  }, [data, deletedIds]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/v1/manager/doctors/${id}`);
    },
    onSuccess: (_data, id) => {
      setDeletedIds((prev) => new Set(prev).add(id));
      qc.invalidateQueries({ queryKey: ["/v1/manager/doctors"], exact: false });
      setTimeout(() => showToast("Doctor removed"), 50);
    },
    onError: (e: any) => {
      if (e?.code === "DOC-DEL-001") {
        showToast("Doctor has appointments — cannot delete", "error");
      } else {
        showToast(e.message ?? "Failed to delete doctor", "error");
      }
    },
  });

  function handleDelete(id: string) {
    deleteMutation.mutate(id);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filterBar}>
        <View style={styles.searchBarRow}>
          <View style={[styles.searchBar, { flex: 1, marginHorizontal: 0, marginBottom: 0 }]}>
            <Ionicons name="search-outline" size={16} color={T.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search doctors..."
              placeholderTextColor={T.textMuted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={16} color={T.textMuted} />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={() => router.push("/(manager)/doctors")}
            style={({ pressed }) => [styles.filterIconBtn, styles.addDoctorBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ paddingTop: T.sp16, paddingBottom: 100 }}>
          {[1, 2, 3].map((k) => <SkeletonCard key={k} />)}
        </ScrollView>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ paddingTop: T.sp12, paddingBottom: bottomPad + 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />}
          ListHeaderComponent={
            rows.length > 0 ? (
              <Text style={styles.listCount}>Doctors ({rows.length})</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="medical-outline" size={40} color={T.border} />
              <Text style={styles.emptyTitle}>No doctors yet</Text>
              <Text style={styles.emptyText}>
                {debouncedSearch ? "Try a different search" : "Tap + to add your first doctor"}
              </Text>
              {!debouncedSearch && (
                <Pressable
                  onPress={() => router.push("/(manager)/doctors")}
                  style={({ pressed }) => [styles.emptyAddBtn, { opacity: pressed ? 0.8 : 1 }]}
                >
                  <Ionicons name="add-circle-outline" size={18} color={T.primary} />
                  <Text style={styles.emptyAddBtnText}>Add Doctor</Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <DoctorListCard
              doctor={item as any}
              onEdit={() => router.push("/(manager)/doctors")}
              onDelete={handleDelete}
            />
          )}
        />
      )}

      <Modal
        visible={!!toast}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.toastOverlay} pointerEvents="none" testID="doctors-toast">
          <View
            style={[
              styles.toastBar,
              toast?.type === "error" ? styles.toastBarError : styles.toastBarSuccess,
            ]}
          >
            <Ionicons
              name={toast?.type === "error" ? "warning-outline" : "checkmark-circle-outline"}
              size={16}
              color="#fff"
            />
            <Text testID="doctors-toast-text" style={styles.toastText}>{toast?.msg}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function UsersScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("Guests");
  const { logout } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : 0;

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  return (
    <View style={styles.root}>
      <ManagerHeader title="Users" onLogout={handleLogout} />
      <View style={[styles.tabs, { paddingTop: Platform.OS === "web" ? 0 : 0 }]}>
        {(["Guests", "Doctors"] as TabType[]).map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>
      {activeTab === "Guests" ? <GuestsTab /> : <DoctorsTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  tabs: {
    flexDirection: "row",
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  tab: {
    flex: 1,
    paddingVertical: T.sp12,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: T.primary,
  },
  tabText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: T.textMuted,
  },
  tabTextActive: {
    color: T.primary,
    fontFamily: "Inter_600SemiBold" as any,
  },
  loader: { paddingTop: 60, alignItems: "center" },
  filterBar: {
    backgroundColor: T.surface,
    paddingTop: T.sp12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: T.sp16,
    marginBottom: T.sp12,
    backgroundColor: T.surfaceSubtle,
    borderRadius: T.r10,
    paddingHorizontal: T.sp12,
    borderWidth: 1,
    borderColor: T.border,
    height: 40,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.text,
    height: 40,
  },
  searchBarRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingBottom: T.sp12,
    gap: T.sp8,
  },
  filterIconBtn: {
    width: 40,
    height: 40,
    borderRadius: T.r10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  filterDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: T.danger,
    borderWidth: 1.5,
    borderColor: T.surface,
  },
  addDoctorBtn: {
    backgroundColor: T.primary,
    borderColor: T.primary,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: T.sp16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: T.r10,
    borderWidth: 1.5,
    borderColor: T.primary,
    backgroundColor: T.primary + "08",
  },
  emptyAddBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: T.primary,
  },
  statusFilters: {
    paddingHorizontal: T.sp16,
    paddingBottom: T.sp12,
    gap: T.sp8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
  },
  filterPillActive: { backgroundColor: T.primary, borderColor: T.primary },
  filterPillText: { fontFamily: "Inter_500Medium", fontSize: 13, color: T.textSec },
  filterPillTextActive: { color: "#fff" },
  missingFilters: {
    paddingHorizontal: T.sp16,
    paddingBottom: T.sp12,
    gap: T.sp8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: T.r6,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
  },
  filterChipActive: { backgroundColor: T.primary + "10", borderColor: T.primary },
  filterChipWarnActive: { backgroundColor: T.warningBg, borderColor: T.warningBorder },
  filterChipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: T.textSec },
  filterChipTextActive: { color: T.primary },
  filterChipTextWarn: { color: T.warning },
  clearChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: T.r6,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 4,
  },
  clearChipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: T.danger },
  clearFiltersBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: T.r6,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  clearFiltersBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: T.textSec },
  activeFiltersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: T.sp16,
    paddingBottom: T.sp12,
    gap: T.sp8,
  },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 6,
  },
  activeChipText: { fontFamily: "Inter_600SemiBold" as any, fontSize: 11, color: T.primary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp16,
    backgroundColor: T.surface,
    gap: T.sp16,
  },
  rowTopLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  missingTag: {
    backgroundColor: T.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: T.border,
  },
  missingTagWarn: {
    backgroundColor: T.warningBg,
    borderColor: T.warningBorder,
  },
  missingTagText: { fontFamily: "Inter_500Medium", fontSize: 10, color: T.textMuted },
  missingTagTextWarn: { color: T.warning },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 16 },
  rowInfo: { flex: 1 },
  rowName: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 16,
    color: T.text,
    flex: 1,
    marginRight: 8,
  },
  rowMeta: { fontFamily: "Inter_400Regular", fontSize: 13, color: T.textMuted },
  doctorCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp16,
    backgroundColor: T.surface,
    gap: T.sp16,
  },
  doctorInfo: { flex: 1 },
  doctorName: { fontFamily: "Inter_700Bold", fontSize: 16, color: T.text, marginBottom: 2 },
  doctorSpecialty: { fontFamily: "Inter_500Medium", fontSize: 14, color: T.primary, marginBottom: 4 },
  doctorPhone: { fontFamily: "Inter_400Regular", fontSize: 13, color: T.textMuted },
  listCount: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 13,
    color: T.textMuted,
    paddingHorizontal: T.sp16,
    paddingBottom: T.sp8,
    paddingTop: 4,
  },
  empty: { paddingTop: 72, alignItems: "center", gap: T.sp8, paddingHorizontal: T.sp32 },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 16,
    color: T.text,
    textAlign: "center",
  },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textMuted, textAlign: "center" },
  fab: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 34 + 84 + 16 : 84 + 16,
    right: T.sp20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
    ...cardShadow,
    elevation: 6,
  },
  modal: { flex: 1, backgroundColor: T.bg },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: T.sp20,
    paddingTop: T.sp24,
    paddingBottom: T.sp16,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: T.text },
  stepBadge: {
    backgroundColor: T.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepText: { fontFamily: "Inter_600SemiBold" as any, fontSize: 12, color: T.primary },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp24,
    paddingVertical: T.sp12,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: T.border,
  },
  stepDotActive: { backgroundColor: T.primary },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: T.border,
    marginHorizontal: 4,
  },
  stepLineActive: { backgroundColor: T.primary },
  stepTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: T.text,
    marginBottom: T.sp4,
  },
  modalScroll: { flex: 1 },
  modalContent: { padding: T.sp20, gap: T.sp16, paddingBottom: 40 },
  sectionDivider: {
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingTop: T.sp12,
    marginTop: T.sp4,
  },
  sectionDividerText: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 12,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  field: { gap: T.sp4 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: T.textMuted, letterSpacing: 0.3 },
  fieldInput: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.r10,
    paddingHorizontal: 14,
    paddingVertical: T.sp12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: T.text,
  },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.r10,
    paddingHorizontal: 14,
    paddingVertical: T.sp12,
    height: 48,
  },
  pickerBtnText: { fontFamily: "Inter_400Regular", fontSize: 15, color: T.text },
  pickerBtnPlaceholder: { fontFamily: "Inter_400Regular", fontSize: 15, color: T.textMuted },
  phoneRow: {
    flexDirection: "row",
    gap: T.sp8,
  },
  dialCodeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.r10,
    paddingHorizontal: 12,
    height: 48,
    gap: 6,
  },
  dialCodeText: { fontFamily: "Inter_500Medium", fontSize: 14, color: T.text },
  phoneInput: {
    flex: 1,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.r10,
    paddingHorizontal: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: T.text,
    height: 48,
  },
  formError: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.danger,
    textAlign: "center",
    paddingVertical: T.sp8,
  },
  modalActions: {
    flexDirection: "row",
    padding: T.sp20,
    gap: T.sp12,
    borderTopWidth: 1,
    borderTopColor: T.border,
    backgroundColor: T.surface,
    ...(Platform.OS === "web" ? { paddingBottom: 34 } : {}),
  },
  btnSecondary: {
    flex: 1,
    height: 46,
    borderRadius: T.r10,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.surface,
  },
  btnSecondaryText: { fontFamily: "Inter_500Medium", fontSize: 15, color: T.text },
  btnPrimary: {
    flex: 1,
    height: 46,
    borderRadius: T.r10,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { fontFamily: "Inter_600SemiBold" as any, fontSize: 15, color: "#fff" },

  cpModal: { flex: 1, backgroundColor: T.bg },
  cpHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: T.sp20,
    paddingTop: T.sp24,
    paddingBottom: T.sp12,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  cpTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: T.text },
  cpSearch: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: T.sp16,
    marginVertical: T.sp12,
    backgroundColor: T.surfaceSubtle,
    borderRadius: T.r10,
    paddingHorizontal: T.sp12,
    borderWidth: 1,
    borderColor: T.border,
    height: 42,
  },
  cpSearchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.text,
    height: 42,
  },
  cpRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
    backgroundColor: T.surface,
    gap: T.sp12,
  },
  cpFlag: { fontSize: 22 },
  cpName: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: T.text },
  cpDial: { fontFamily: "Inter_500Medium", fontSize: 14, color: T.textMuted },
  toastOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: T.sp16,
    paddingBottom: Platform.OS === "web" ? 54 : 34,
  },
  toastBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: T.sp16,
    paddingVertical: 12,
    borderRadius: T.r10,
  },
  toastBarSuccess: { backgroundColor: T.success },
  toastBarError: { backgroundColor: T.danger },
  toastText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "#fff",
  },
});
