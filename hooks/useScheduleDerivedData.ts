import { useMemo } from "react";
import {
  format,
  isAfter,
  isSameDay,
  parseISO,
  startOfDay,
} from "date-fns";
import type { ScheduleAppt } from "./useManagerMonthAppointments";

export type DayMarker =
  | "today"
  | "upcoming"
  | "cancelled"
  | "missed"
  | "completed";

export type ScheduleFilter = "ALL" | "UPCOMING" | "DONE" | "MISSED" | "CANCELLED";

export interface DayGroup {
  dateKey: string;
  dateLabel: string;
  appts: ScheduleAppt[];
}

export interface ScheduleDerivedData {
  dayMarkers: Record<string, DayMarker>;
  selectedDayAppts: ScheduleAppt[];
  nextAppointment: ScheduleAppt | null;
  allScheduledGrouped: DayGroup[];
}

const MISSED_STATUSES = new Set(["MISSED", "NO_SHOW"]);
const DONE_STATUSES = new Set(["DONE"]);
const CANCELLED_STATUSES = new Set(["CANCELLED"]);
const UPCOMING_STATUSES = new Set(["SCHEDULED"]);

export function useScheduleDerivedData(
  appointments: ScheduleAppt[],
  selectedDay: Date,
  filter: ScheduleFilter = "ALL",
): ScheduleDerivedData {
  const todayStr = new Date().toDateString();

  return useMemo(() => {
    const todayStart = startOfDay(new Date());
    const now = new Date();
    const todayKey = format(todayStart, "yyyy-MM-dd");

    // ── Group appointments by date key ───────────────────────────────────────
    const byDate = new Map<string, ScheduleAppt[]>();
    for (const appt of appointments) {
      const key = format(parseISO(appt.startAt), "yyyy-MM-dd");
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(appt);
    }

    // ── Day markers ──────────────────────────────────────────────────────────
    const dayMarkers: Record<string, DayMarker> = {};

    for (const [key, dayAppts] of byDate.entries()) {
      const d = parseISO(`${key}T00:00:00`);

      if (isSameDay(d, todayStart)) {
        dayMarkers[key] = "today";
        continue;
      }

      if (isAfter(d, todayStart)) {
        // Future day: upcoming takes priority, then cancelled
        if (dayAppts.some((a: ScheduleAppt) => UPCOMING_STATUSES.has(a.status))) {
          dayMarkers[key] = "upcoming";
        } else if (dayAppts.every((a: ScheduleAppt) => CANCELLED_STATUSES.has(a.status))) {
          dayMarkers[key] = "cancelled";
        }
        continue;
      }

      // Past day priority: missed > completed > cancelled
      if (dayAppts.some((a: ScheduleAppt) => MISSED_STATUSES.has(a.status))) {
        dayMarkers[key] = "missed";
      } else if (dayAppts.some((a: ScheduleAppt) => DONE_STATUSES.has(a.status))) {
        dayMarkers[key] = "completed";
      } else if (dayAppts.every((a: ScheduleAppt) => CANCELLED_STATUSES.has(a.status))) {
        dayMarkers[key] = "cancelled";
      }
    }

    // Today always marked
    dayMarkers[todayKey] = "today";

    // ── Selected day appointments ────────────────────────────────────────────
    const selectedDayAppts = (
      byDate.get(format(selectedDay, "yyyy-MM-dd")) ?? []
    )
      .slice()
      .sort(
        (a, b) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      );

    // ── Next appointment ─────────────────────────────────────────────────────
    const nextAppointment =
      appointments
        .filter(
          (a) => UPCOMING_STATUSES.has(a.status) && isAfter(parseISO(a.startAt), now),
        )
        .sort(
          (a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        )[0] ?? null;

    // ── All scheduled grouped (with filter) ──────────────────────────────────
    const filtered = appointments.filter((a) => {
      if (filter === "UPCOMING") return UPCOMING_STATUSES.has(a.status);
      if (filter === "DONE") return DONE_STATUSES.has(a.status);
      if (filter === "MISSED") return MISSED_STATUSES.has(a.status);
      if (filter === "CANCELLED") return CANCELLED_STATUSES.has(a.status);
      return true;
    });

    const groupMap = new Map<string, ScheduleAppt[]>();
    for (const appt of filtered) {
      const key = format(parseISO(appt.startAt), "yyyy-MM-dd");
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(appt);
    }

    const allScheduledGrouped: DayGroup[] = Array.from(groupMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, appts]) => ({
        dateKey: key,
        dateLabel: format(parseISO(`${key}T00:00:00`), "EEEE, MMM d"),
        appts: appts
          .slice()
          .sort(
            (a, b) =>
              new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
          ),
      }));

    return {
      dayMarkers,
      selectedDayAppts,
      nextAppointment,
      allScheduledGrouped,
    };
  }, [appointments, selectedDay, filter, todayStr]);
}
