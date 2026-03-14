import type { DashboardAppt } from "../schemas/managerDashboard.schemas";

export interface ManagerDashboardData {
  activeGuests: number;
  appointmentsToday: number;
  pendingDocuments: number;
  missingAssignments: number;
  upcomingNext7Days: number;
  arrivingThisMonth: number;
  todayAppointments: DashboardAppt[];
  monthAppointments: DashboardAppt[];
}

export interface IManagerDashboardRepo {
  getData(clinicId: string): Promise<ManagerDashboardData>;
}
