import { useMemo, useState } from "react";
import type { PatientAppointment } from "./useGuestDashboard";
import { useGuestDashboard } from "./useGuestDashboard";
import { useGuestAppointmentsBuckets } from "./useGuestAppointmentsBuckets";

export type StatusFilter =
  | "all"
  | "upcoming"
  | "today"
  | "completed"
  | "missed"
  | "cancelled";

export type RangeFilter = "all" | "this_week" | "this_month";

export interface ScheduleSection {
  title: string;
  data: PatientAppointment[];
}

function isThisWeek(date: Date): boolean {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return date >= weekStart && date <= weekEnd;
}

function isThisMonth(date: Date): boolean {
  const now = new Date();
  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

function formatSectionTitle(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const t = d.getTime();
  if (t === today.getTime()) return "Today";
  if (t === tomorrow.getTime()) return "Tomorrow";
  if (t === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function getEffectiveStatus(
  appt: PatientAppointment
): "SCHEDULED" | "DONE" | "CANCELLED" | "MISSED" {
  if (appt.status === "DONE") return "DONE";
  if (appt.status === "CANCELLED") return "CANCELLED";
  const start = new Date(appt.startAt);
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (start < now && start >= todayStart) return "SCHEDULED";
  if (start < now) return "MISSED";
  return "SCHEDULED";
}

export function useGuestScheduleFilters() {
  const { appointments } = useGuestDashboard();
  const buckets = useGuestAppointmentsBuckets();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("all");
  const [search, setSearch] = useState("");

  const sections = useMemo<ScheduleSection[]>(() => {
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let filtered = [...appointments];

    if (rangeFilter === "this_week") {
      filtered = filtered.filter((a) => isThisWeek(new Date(a.startAt)));
    } else if (rangeFilter === "this_month") {
      filtered = filtered.filter((a) => isThisMonth(new Date(a.startAt)));
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => {
        const start = new Date(a.startAt);
        const isToday = start >= todayStart && start <= todayEnd;
        const isPast = start < now;
        switch (statusFilter) {
          case "upcoming":
            return a.status === "SCHEDULED" && !isToday && !isPast;
          case "today":
            return a.status === "SCHEDULED" && isToday;
          case "completed":
            return a.status === "DONE";
          case "missed":
            return a.status === "SCHEDULED" && isPast && !isToday;
          case "cancelled":
            return a.status === "CANCELLED";
          default:
            return true;
        }
      });
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.doctor?.fullName ?? "").toLowerCase().includes(q)
      );
    }

    filtered.sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );

    const groups = new Map<string, PatientAppointment[]>();
    for (const appt of filtered) {
      const dateKey = new Date(appt.startAt).toISOString().split("T")[0];
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(appt);
    }

    return Array.from(groups.entries()).map(([dateKey, data]) => ({
      title: formatSectionTitle(dateKey),
      data,
    }));
  }, [appointments, statusFilter, rangeFilter, search]);

  const totalFiltered = sections.reduce((acc, s) => acc + s.data.length, 0);

  return {
    statusFilter,
    setStatusFilter,
    rangeFilter,
    setRangeFilter,
    search,
    setSearch,
    sections,
    totalFiltered,
    ...buckets,
  };
}
