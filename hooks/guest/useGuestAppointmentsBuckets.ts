import { useMemo } from "react";
import type { PatientAppointment } from "./useGuestDashboard";
import { useGuestDashboard } from "./useGuestDashboard";

export type BucketKey = "today" | "upcoming" | "completed" | "missed" | "cancelled";

export interface AppointmentBuckets {
  today: PatientAppointment[];
  upcoming: PatientAppointment[];
  completed: PatientAppointment[];
  missed: PatientAppointment[];
  cancelled: PatientAppointment[];
  counts: Record<BucketKey, number>;
  next: PatientAppointment | null;
  total: number;
}

function byStartAsc(a: PatientAppointment, b: PatientAppointment) {
  return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
}
function byStartDesc(a: PatientAppointment, b: PatientAppointment) {
  return new Date(b.startAt).getTime() - new Date(a.startAt).getTime();
}

function buildBuckets(appointments: PatientAppointment[]): AppointmentBuckets {
  const now = new Date();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const today: PatientAppointment[]     = [];
  const upcoming: PatientAppointment[]  = [];
  const completed: PatientAppointment[] = [];
  const missed: PatientAppointment[]    = [];
  const cancelled: PatientAppointment[] = [];

  for (const a of appointments) {
    const start  = new Date(a.startAt);
    const isPast = start < now;
    const isToday = start >= todayStart && start <= todayEnd;

    if (a.status === "CANCELLED") {
      cancelled.push(a);
    } else if (a.status === "DONE") {
      completed.push(a);
    } else {
      if (isToday) {
        today.push(a);
      } else if (isPast) {
        missed.push(a);
      } else {
        upcoming.push(a);
      }
    }
  }

  today.sort(byStartAsc);
  upcoming.sort(byStartAsc);
  completed.sort(byStartDesc);
  missed.sort(byStartDesc);
  cancelled.sort(byStartDesc);

  const counts: Record<BucketKey, number> = {
    today: today.length,
    upcoming: upcoming.length,
    completed: completed.length,
    missed: missed.length,
    cancelled: cancelled.length,
  };

  const next = today[0] ?? upcoming[0] ?? null;

  return { today, upcoming, completed, missed, cancelled, counts, next, total: appointments.length };
}

export function useGuestAppointmentsBuckets(): AppointmentBuckets & {
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const { isLoading, isError, refetch, appointments } = useGuestDashboard();

  const buckets = useMemo(() => buildBuckets(appointments), [appointments]);

  return { isLoading, isError, refetch, ...buckets };
}
