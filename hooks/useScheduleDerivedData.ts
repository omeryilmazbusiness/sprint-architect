import { useMemo } from "react";
import {
  format,
  isAfter,
  isSameDay,
  parseISO,
  startOfDay,
} from "date-fns";
import type { ScheduleAppt } from "./useManagerMonthAppointments";

export type DayMarker = "today" | "upcoming" | "pastDone";
export type ScheduleFilter = "ALL" | "UPCOMING" | "DONE";

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

    // ── Day markers (two-pass, per-date logic) ───────────────────────────────
    const dayMarkers: Record<string, DayMarker> = {};

    for (const [key, dayAppts] of byDate.entries()) {
      const d = parseISO(`${key}T00:00:00`);

      if (isSameDay(d, todayStart)) {
        dayMarkers[key] = "today";
        continue;
      }

      if (isAfter(d, todayStart)) {
        // Future: green if any SCHEDULED
        if (dayAppts.some((a) => a.status === "SCHEDULED")) {
          dayMarkers[key] = "upcoming";
        }
        continue;
      }

      // Past: gray only if no SCHEDULED (all completed/cancelled)
      const hasScheduled = dayAppts.some((a) => a.status === "SCHEDULED");
      const hasDone = dayAppts.some(
        (a) => a.status === "DONE" || a.status === "CANCELLED",
      );
      if (!hasScheduled && hasDone) {
        dayMarkers[key] = "pastDone";
      }
    }

    // Today always gets its marker (even with no appointments)
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
          (a) => a.status === "SCHEDULED" && isAfter(parseISO(a.startAt), now),
        )
        .sort(
          (a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        )[0] ?? null;

    // ── All scheduled grouped (with filter) ──────────────────────────────────
    const filtered = appointments.filter((a) => {
      if (filter === "UPCOMING") return a.status === "SCHEDULED";
      if (filter === "DONE") return a.status === "DONE";
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
