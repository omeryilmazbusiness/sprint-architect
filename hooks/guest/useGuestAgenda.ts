import { useMemo, useState } from "react";
import type { PatientAppointment } from "./useGuestDashboard";

export type CalendarMark =
  | "past-done"
  | "past-missed"
  | "today"
  | "future-scheduled"
  | "future-cancelled"
  | null;

export interface CalendarDay {
  date: Date;
  day: number;
  mark: CalendarMark;
  isToday: boolean;
  hasAppointment: boolean;
}

export type AgendaTab = "today" | "upcoming" | "completed";

function toDateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dominantMark(
  appts: PatientAppointment[],
  date: Date,
  today: Date
): CalendarMark {
  if (appts.length === 0) return null;
  const isToday = isSameDay(date, today);
  if (isToday) return "today";
  const isPast = date < today;
  if (isPast) {
    const hasMissed = appts.some(
      (a) =>
        a.status === "CANCELLED" ||
        a.status === "NO_SHOW" ||
        a.status === "MISSED" ||
        a.status === "SCHEDULED"
    );
    if (hasMissed) return "past-missed";
    return "past-done";
  }
  const hasCancelled = appts.every((a) => a.status === "CANCELLED");
  if (hasCancelled) return "future-cancelled";
  return "future-scheduled";
}

export function useGuestAgenda(appointments: PatientAppointment[]) {
  const today = useMemo(() => toDateOnly(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [viewMonth, setViewMonth] = useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const calendarDays = useMemo<CalendarDay[]>(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: CalendarDay[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ date: new Date(0), day: 0, mark: null, isToday: false, hasAppointment: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isToday = isSameDay(date, today);
      const dayAppts = appointments.filter((a) =>
        isSameDay(toDateOnly(new Date(a.startAt)), date)
      );
      const hasAppointment = dayAppts.length > 0;
      const mark = hasAppointment
        ? dominantMark(dayAppts, date, today)
        : isToday
        ? "today"
        : null;
      days.push({ date, day: d, mark, isToday, hasAppointment });
    }
    return days;
  }, [viewMonth, appointments, today]);

  const dayAgenda = useMemo(
    () => appointments.filter((a) => isSameDay(toDateOnly(new Date(a.startAt)), selectedDate)),
    [appointments, selectedDate]
  );

  const todayList = useMemo(
    () =>
      appointments.filter(
        (a) =>
          isSameDay(toDateOnly(new Date(a.startAt)), today) &&
          a.status !== "CANCELLED"
      ),
    [appointments, today]
  );

  const upcomingList = useMemo(
    () =>
      appointments
        .filter(
          (a) =>
            toDateOnly(new Date(a.startAt)) > today && a.status === "SCHEDULED"
        )
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [appointments, today]
  );

  const completedList = useMemo(
    () =>
      appointments
        .filter(
          (a) =>
            a.status === "DONE" ||
            a.status === "CANCELLED" ||
            a.status === "NO_SHOW" ||
            a.status === "MISSED"
        )
        .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()),
    [appointments]
  );

  function prevMonth() {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }
  function nextMonth() {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  const monthLabel = viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return {
    calendarDays,
    selectedDate,
    setSelectedDate,
    viewMonth,
    prevMonth,
    nextMonth,
    monthLabel,
    dayAgenda,
    todayList,
    upcomingList,
    completedList,
    today,
  };
}
