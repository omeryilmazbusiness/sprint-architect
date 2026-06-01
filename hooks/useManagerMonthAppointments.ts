import { useQuery } from "@tanstack/react-query";
import { format, endOfMonth, startOfMonth } from "date-fns";
import { apiRequest } from "@/lib/query-client";
import { DISPLAY_TERMS } from "@/constants/terminology";

export interface ScheduleAppt {
  id: string;
  startAt: string;
  title: string;
  status: string;
  patientId: string | null;
  patientName: string;
  doctorName: string | null;
}

interface RawAppt {
  id: string;
  startAt: string;
  title: string;
  type?: string;
  status: string;
  patient?: { id: string; fullName: string } | null;
  doctor?: { id: string; fullName: string } | null;
}

function normalizeAppt(raw: RawAppt): ScheduleAppt {
  return {
    id: raw.id,
    startAt: raw.startAt,
    title: raw.title || raw.type || DISPLAY_TERMS.appointment,
    status: raw.status,
    patientId: raw.patient?.id ?? null,
    patientName: raw.patient?.fullName ?? "Guest",
    doctorName: raw.doctor?.fullName ?? null,
  };
}

export function useManagerMonthAppointments(currentMonth: Date) {
  const from = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const to = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const query = useQuery<ScheduleAppt[]>({
    queryKey: ["/v1/manager/appointments", "month", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const res = await apiRequest("GET", `/v1/manager/appointments?from=${from}&to=${to}`);
      const raw: RawAppt[] = await res.json();
      return Array.isArray(raw) ? raw.map(normalizeAppt) : [];
    },
    staleTime: 60_000,
  });

  return {
    ...query,
    appointments: query.data ?? [],
  };
}
