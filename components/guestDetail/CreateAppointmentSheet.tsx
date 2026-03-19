import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import { apiRequest } from "@/lib/query-client";

interface Doctor {
  id: string;
  fullName: string;
  specialty: string | null;
}

interface Props {
  visible: boolean;
  patientId: string;
  onClose: () => void;
  onCreated: () => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 21; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 21) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

function buildCalendar(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) days.push(null);
  for (let d = 1; d <= lastDay; d++) days.push(d);
  return days;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CreateAppointmentSheet({
  visible,
  patientId,
  onClose,
  onCreated,
}: Props) {
  const queryClient = useQueryClient();
  const now = new Date();

  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedDoctorName, setSelectedDoctorName] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: doctorData, isLoading: loadingDoctors } = useQuery<{
    rows: Doctor[];
  }>({
    queryKey: ["/v1/manager/doctors"],
    enabled: visible,
  });

  const allDoctors = doctorData?.rows ?? [];
  const doctors = allDoctors.filter((d) => {
    if (!doctorSearch.trim()) return true;
    const q = doctorSearch.toLowerCase();
    return (
      d.fullName.toLowerCase().includes(q) ||
      (d.specialty ?? "").toLowerCase().includes(q)
    );
  });

  const mutation = useMutation({
    mutationFn: (body: object) =>
      apiRequest("POST", `/v1/manager/patients/${patientId}/appointments`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/v1/manager/patients/${patientId}/details`],
      });
      queryClient.invalidateQueries({ queryKey: ["/v1/manager/appointments"] });
      onCreated();
      handleClose();
    },
  });

  function resetForm() {
    const n = new Date();
    setCalYear(n.getFullYear());
    setCalMonth(n.getMonth());
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedDoctorId(null);
    setSelectedDoctorName(null);
    setTitle("");
    setDoctorSearch("");
    setErrors({});
  }

  function handleClose() {
    onClose();
    resetForm();
  }

  function prevMonth() {
    if (calMonth === 0) {
      setCalYear((y) => y - 1);
      setCalMonth(11);
    } else {
      setCalMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (calMonth === 11) {
      setCalYear((y) => y + 1);
      setCalMonth(0);
    } else {
      setCalMonth((m) => m + 1);
    }
  }

  function isPast(day: number) {
    const d = new Date(calYear, calMonth, day, 23, 59, 59);
    return d < now;
  }

  function isToday(day: number) {
    const d = new Date(calYear, calMonth, day);
    return d.toDateString() === now.toDateString();
  }

  function isSelected(day: number) {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === calYear &&
      selectedDate.getMonth() === calMonth &&
      selectedDate.getDate() === day
    );
  }

  function handleDayPress(day: number) {
    setSelectedDate(new Date(calYear, calMonth, day));
    setErrors((e) => ({ ...e, date: "" }));
  }

  function handleSelectDoctor(doc: Doctor) {
    setSelectedDoctorId(doc.id);
    setSelectedDoctorName(doc.fullName);
    setErrors((e) => ({ ...e, doctor: "" }));
  }

  function handleSubmit() {
    const errs: Record<string, string> = {};
    if (!selectedDate) errs.date = "Select a date";
    if (!selectedTime) errs.time = "Select a time";
    if (!selectedDoctorId) errs.doctor = "Select a doctor";
    if (!title.trim() || title.trim().length < 2)
      errs.title = "Enter at least 2 characters";
    if (title.trim().length > 60) errs.title = "Title is too long (max 60)";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const [hours, mins] = selectedTime!.split(":").map(Number);
    const dt = new Date(selectedDate!);
    dt.setHours(hours, mins, 0, 0);

    mutation.mutate({
      title: title.trim(),
      startAt: dt.toISOString(),
      doctorId: selectedDoctorId!,
    });
  }

  const calDays = buildCalendar(calYear, calMonth);
  const hasPreview =
    selectedDate || selectedTime || selectedDoctorName || title.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kavWrapper}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>New Appointment</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={T.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Date ── */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={styles.sectionLabel}>Date</Text>
                {errors.date ? (
                  <Text style={styles.fieldError}>{errors.date}</Text>
                ) : null}
              </View>
              <View style={[styles.calCard, errors.date ? styles.cardError : null]}>
                <View style={styles.calNav}>
                  <Pressable onPress={prevMonth} hitSlop={10} style={styles.calNavBtn}>
                    <Ionicons name="chevron-back" size={18} color={T.accent} />
                  </Pressable>
                  <Text style={styles.calMonthLabel}>
                    {MONTHS[calMonth]} {calYear}
                  </Text>
                  <Pressable onPress={nextMonth} hitSlop={10} style={styles.calNavBtn}>
                    <Ionicons name="chevron-forward" size={18} color={T.accent} />
                  </Pressable>
                </View>

                <View style={styles.calDayLabels}>
                  {DAY_LABELS.map((l) => (
                    <Text key={l} style={styles.calDayLabel}>
                      {l}
                    </Text>
                  ))}
                </View>

                <View style={styles.calGrid}>
                  {calDays.map((day, idx) => {
                    if (!day) {
                      return <View key={`e-${idx}`} style={styles.calCell} />;
                    }
                    const past = isPast(day);
                    const sel = isSelected(day);
                    const tod = isToday(day);
                    return (
                      <Pressable
                        key={`d-${idx}`}
                        style={[
                          styles.calCell,
                          styles.calDayBase,
                          sel && styles.calDaySelected,
                          tod && !sel && styles.calDayToday,
                          past && styles.calDayPast,
                        ]}
                        onPress={() => !past && handleDayPress(day)}
                        disabled={past}
                      >
                        <Text
                          style={[
                            styles.calDayText,
                            sel && styles.calDayTextSel,
                            tod && !sel && styles.calDayTextToday,
                            past && styles.calDayTextPast,
                          ]}
                        >
                          {day}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* ── Time ── */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={styles.sectionLabel}>Time</Text>
                {errors.time ? (
                  <Text style={styles.fieldError}>{errors.time}</Text>
                ) : null}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timeRow}
              >
                {TIME_SLOTS.map((slot) => {
                  const sel = selectedTime === slot;
                  return (
                    <Pressable
                      key={slot}
                      style={[styles.timeChip, sel && styles.timeChipSel]}
                      onPress={() => {
                        setSelectedTime(slot);
                        setErrors((e) => ({ ...e, time: "" }));
                      }}
                    >
                      <Text
                        style={[styles.timeChipText, sel && styles.timeChipTextSel]}
                      >
                        {slot}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* ── Doctor ── */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={styles.sectionLabel}>Doctor</Text>
                {errors.doctor ? (
                  <Text style={styles.fieldError}>{errors.doctor}</Text>
                ) : null}
              </View>
              <View
                style={[
                  styles.searchBox,
                  errors.doctor ? styles.cardError : null,
                ]}
              >
                <Ionicons name="search-outline" size={16} color={T.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or specialty"
                  placeholderTextColor={T.textMuted}
                  value={doctorSearch}
                  onChangeText={setDoctorSearch}
                />
                {doctorSearch.length > 0 && (
                  <Pressable onPress={() => setDoctorSearch("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={T.textMuted} />
                  </Pressable>
                )}
              </View>
              {loadingDoctors ? (
                <ActivityIndicator
                  color={T.accent}
                  style={{ marginVertical: 16 }}
                />
              ) : doctors.length === 0 ? (
                <Text style={styles.emptyText}>
                  {doctorSearch ? "No doctors match your search" : "No doctors available"}
                </Text>
              ) : (
                <View style={styles.doctorList}>
                  {doctors.slice(0, 6).map((doc) => {
                    const sel = selectedDoctorId === doc.id;
                    return (
                      <Pressable
                        key={doc.id}
                        style={[
                          styles.doctorItem,
                          sel && styles.doctorItemSel,
                        ]}
                        onPress={() => handleSelectDoctor(doc)}
                      >
                        <View
                          style={[
                            styles.avatar,
                            sel && styles.avatarSel,
                          ]}
                        >
                          <Text
                            style={[
                              styles.avatarText,
                              sel && styles.avatarTextSel,
                            ]}
                          >
                            {doc.fullName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.doctorInfo}>
                          <Text
                            style={[
                              styles.doctorName,
                              sel && styles.doctorNameSel,
                            ]}
                            numberOfLines={1}
                          >
                            {doc.fullName}
                          </Text>
                          {doc.specialty ? (
                            <Text style={styles.doctorSpec} numberOfLines={1}>
                              {doc.specialty}
                            </Text>
                          ) : null}
                        </View>
                        {sel && (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color={T.accent}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                  {doctors.length > 6 && (
                    <Text style={styles.moreHint}>
                      +{doctors.length - 6} more — refine your search
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* ── Title ── */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={styles.sectionLabel}>Procedure / Title</Text>
                {errors.title ? (
                  <Text style={styles.fieldError}>{errors.title}</Text>
                ) : null}
              </View>
              <TextInput
                style={[styles.titleInput, errors.title ? styles.cardError : null]}
                placeholder="e.g. Hair Transplant Consultation"
                placeholderTextColor={T.textMuted}
                value={title}
                onChangeText={(t) => {
                  setTitle(t);
                  setErrors((e) => ({ ...e, title: "" }));
                }}
                maxLength={60}
                returnKeyType="done"
              />
            </View>

            {/* ── Preview ── */}
            {hasPreview ? (
              <View style={[styles.previewCard, cardShadow]}>
                <Text style={styles.previewLabel}>Summary</Text>
                {selectedDate && selectedTime && (
                  <View style={styles.previewRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color={T.accent}
                    />
                    <Text style={styles.previewText}>
                      {fmtDate(selectedDate)} · {selectedTime}
                    </Text>
                  </View>
                )}
                {selectedDoctorName && (
                  <View style={styles.previewRow}>
                    <Ionicons
                      name="person-outline"
                      size={14}
                      color={T.accent}
                    />
                    <Text style={styles.previewText}>{selectedDoctorName}</Text>
                  </View>
                )}
                {title.trim() ? (
                  <View style={styles.previewRow}>
                    <Ionicons
                      name="medical-outline"
                      size={14}
                      color={T.accent}
                    />
                    <Text style={styles.previewText}>{title.trim()}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* ── Error ── */}
            {mutation.isError ? (
              <Text style={styles.submitError}>
                Failed to create appointment. Please try again.
              </Text>
            ) : null}

            {/* ── Submit ── */}
            <Pressable
              style={[
                styles.submitBtn,
                mutation.isPending && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitText}>Create Appointment</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  kavWrapper: {
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "93%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: T.sp20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  sheetTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: T.text,
  },
  body: {
    padding: T.sp16,
    paddingBottom: Platform.OS === "web" ? 48 : 56,
    gap: 20,
  },
  section: {
    gap: 10,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: T.textSec,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  fieldError: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.danger,
  },
  cardError: {
    borderColor: T.danger,
  },

  /* ── Calendar ── */
  calCard: {
    backgroundColor: T.surfaceSubtle,
    borderRadius: T.r12,
    borderWidth: 1,
    borderColor: T.border,
    padding: T.sp12,
  },
  calNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  calNavBtn: {
    padding: 4,
  },
  calMonthLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: T.text,
  },
  calDayLabels: {
    flexDirection: "row",
    marginBottom: 4,
  },
  calDayLabel: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: T.textMuted,
  },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calCell: {
    width: "14.285714%",
    alignItems: "center",
    paddingVertical: 3,
  },
  calDayBase: {
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  calDaySelected: {
    backgroundColor: T.accent,
  },
  calDayToday: {
    backgroundColor: "#DBEAFE",
  },
  calDayPast: {
    opacity: 0.3,
  },
  calDayText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.text,
  },
  calDayTextSel: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  calDayTextToday: {
    color: T.accent,
    fontFamily: "Inter_600SemiBold",
  },
  calDayTextPast: {
    color: T.textMuted,
  },

  /* ── Time ── */
  timeRow: {
    gap: 8,
    paddingVertical: 2,
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: T.r8,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
  },
  timeChipSel: {
    backgroundColor: T.accent,
    borderColor: T.accent,
  },
  timeChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.textSec,
  },
  timeChipTextSel: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },

  /* ── Doctor ── */
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: T.surfaceSubtle,
    borderRadius: T.r8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.text,
    padding: 0,
  },
  doctorList: {
    gap: 6,
  },
  doctorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: T.r10,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
  },
  doctorItemSel: {
    borderColor: T.accent,
    backgroundColor: "#EFF6FF",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.inactiveBg,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSel: {
    backgroundColor: T.accent,
  },
  avatarText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: T.textSec,
  },
  avatarTextSel: {
    color: "#fff",
  },
  doctorInfo: {
    flex: 1,
    gap: 2,
  },
  doctorName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: T.text,
  },
  doctorNameSel: {
    color: T.accent,
  },
  doctorSpec: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
  emptyText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.textMuted,
    textAlign: "center",
    paddingVertical: 16,
  },
  moreHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
    textAlign: "center",
    paddingVertical: 4,
  },

  /* ── Title ── */
  titleInput: {
    backgroundColor: T.surfaceSubtle,
    borderRadius: T.r8,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.text,
  },

  /* ── Preview ── */
  previewCard: {
    backgroundColor: "#F0F9FF",
    borderRadius: T.r12,
    padding: T.sp16,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: T.accent,
  },
  previewLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: T.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    flex: 1,
  },

  /* ── Submit ── */
  submitError: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.danger,
    textAlign: "center",
  },
  submitBtn: {
    backgroundColor: T.accent,
    borderRadius: T.r12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#fff",
  },
});
