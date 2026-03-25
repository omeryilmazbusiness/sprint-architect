import { useGuestDashboard, PatientAppointment } from "./useGuestDashboard";

export type { PatientAppointment };

export function useGuestSchedule() {
  const { isLoading, isError, refetch, appointments } = useGuestDashboard();

  const now = new Date();

  const upcoming = appointments.filter(
    (a) => a.status === "SCHEDULED" && new Date(a.startAt) >= now
  );
  const past = appointments.filter(
    (a) => a.status === "DONE" || new Date(a.startAt) < now
  );
  const next = upcoming[0] ?? null;

  return {
    isLoading,
    isError,
    refetch,
    appointments,
    upcoming,
    past,
    next,
  };
}
