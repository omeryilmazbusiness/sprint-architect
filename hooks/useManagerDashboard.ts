import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export interface DashboardAppt {
  id: string;
  startAt: string;
  title: string;
  status: string;
  patientId: string | null;
  patientName: string;
  doctorName: string | null;
}

export interface ManagerDashboardData {
  currentMonth: string;
  kpis: {
    activeGuests: number;
    appointmentsToday: number;
    pendingDocuments: number;
    missingAssignments: number;
  };
  upcomingNext7Days: number;
  arrivingThisMonth: number;
  todayAppointments: DashboardAppt[];
  monthAppointments: DashboardAppt[];
}

const DEFAULT_DATA: ManagerDashboardData = {
  currentMonth: format(new Date(), "yyyy-MM"),
  kpis: {
    activeGuests: 0,
    appointmentsToday: 0,
    pendingDocuments: 0,
    missingAssignments: 0,
  },
  upcomingNext7Days: 0,
  arrivingThisMonth: 0,
  todayAppointments: [],
  monthAppointments: [],
};

export function useManagerDashboard() {
  const query = useQuery<ManagerDashboardData>({
    queryKey: ["/v1/manager/dashboard"],
    staleTime: 60_000,
  });
  return {
    ...query,
    data: query.data ?? DEFAULT_DATA,
  };
}
