import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isToday,
  isBefore,
  parseISO,
} from "date-fns";
import { T } from "@/constants/adminTheme";

interface DatePickerModalProps {
  visible: boolean;
  value: string;
  title?: string;
  minDate?: string;
  onConfirm: (date: string) => void;
  onClose: () => void;
}

export function DatePickerModal({ visible, value, title = "Select Date", minDate, onConfirm, onClose }: DatePickerModalProps) {
  const initialDate = value ? parseISO(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDate);
  const [selected, setSelected] = useState<Date | null>(value ? parseISO(value) : null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = useMemo(() => eachDayOfInterval({ start: calendarStart, end: calendarEnd }), [calendarStart, calendarEnd]);
  const minDateParsed = minDate ? parseISO(minDate) : null;

  const isDisabled = (day: Date) => {
    if (!minDateParsed) return false;
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const minStart = new Date(minDateParsed.getFullYear(), minDateParsed.getMonth(), minDateParsed.getDate());
    return isBefore(dayStart, minStart);
  };

  const handleConfirm = () => {
    if (selected) {
      onConfirm(format(selected, "yyyy-MM-dd"));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={T.text} />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.monthNav}>
            <Pressable onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={T.primary} />
            </Pressable>
            <Text style={styles.monthText}>{format(currentMonth, "MMMM yyyy")}</Text>
            <Pressable onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={T.primary} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
              <Text key={i} style={styles.weekDay}>{d}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {calendarDays.map((day, i) => {
              const inMonth = isSameMonth(day, currentMonth);
              const isSel = selected ? isSameDay(day, selected) : false;
              const isTodayDay = isToday(day);
              const disabled = isDisabled(day);
              return (
                <Pressable
                  key={i}
                  testID={`day-${format(day, "yyyy-MM-dd")}`}
                  onPress={() => {
                    if (!disabled) {
                      setSelected(new Date(day.getTime()));
                    }
                  }}
                  style={({ pressed }) => [
                    styles.dayCell,
                    isSel && styles.dayCellSelected,
                    isTodayDay && !isSel && styles.dayCellToday,
                    (disabled || !inMonth) && styles.dayCellDisabled,
                    pressed && !disabled && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[
                    styles.dayText,
                    !inMonth && styles.dayTextOtherMonth,
                    isSel && styles.dayTextSelected,
                    isTodayDay && !isSel && styles.dayTextToday,
                    disabled && styles.dayTextDisabled,
                  ]}>
                    {format(day, "d")}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {selected && (
            <View style={styles.selectedDisplay}>
              <Ionicons name="calendar" size={16} color={T.primary} />
              <Text style={styles.selectedText}>Selected: {format(selected, "MMMM d, yyyy")}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.confirmBtn, !selected && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!selected}
          >
            <Text style={styles.confirmText}>
              {selected ? "Confirm Date" : "Pick a Date"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const DAY_CELL_SIZE = 46;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: T.sp20,
    paddingTop: T.sp24,
    paddingBottom: T.sp16,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  closeBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: T.text,
  },
  body: {
    padding: T.sp20,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: T.sp20,
  },
  navBtn: {
    padding: 10,
    borderRadius: T.r8,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
  },
  monthText: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 16,
    color: T.text,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: T.sp12,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: T.textMuted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  dayCell: {
    width: `${100 / 7}%` as any,
    height: DAY_CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: T.r8,
  },
  dayCellSelected: {
    backgroundColor: T.primary,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: T.primary,
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.text,
  },
  dayTextOtherMonth: {
    color: T.textMuted,
    fontSize: 13,
  },
  dayTextSelected: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  dayTextToday: {
    color: T.primary,
    fontFamily: "Inter_600SemiBold" as any,
  },
  dayTextDisabled: {
    color: T.textMuted,
  },
  selectedDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp8,
    marginTop: T.sp20,
    padding: T.sp12,
    backgroundColor: T.primary + "10",
    borderRadius: T.r10,
    borderWidth: 1,
    borderColor: T.primary + "30",
  },
  selectedText: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 14,
    color: T.primary,
  },
  actions: {
    flexDirection: "row",
    padding: T.sp20,
    gap: T.sp12,
    borderTopWidth: 1,
    borderTopColor: T.border,
    backgroundColor: T.surface,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: T.r10,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: T.text,
  },
  confirmBtn: {
    flex: 2,
    height: 46,
    borderRadius: T.r10,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDisabled: {
    backgroundColor: T.border,
  },
  confirmText: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 15,
    color: "#fff",
  },
});
