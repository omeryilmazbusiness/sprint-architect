import { format } from "date-fns";
import type { IManagerDashboardRepo } from "../repos/ManagerDashboardRepo";
import type { ManagerDashboardResponse } from "../schemas/managerDashboard.schemas";

export class GetManagerDashboard {
  constructor(private readonly repo: IManagerDashboardRepo) {}

  async execute(clinicId: string): Promise<ManagerDashboardResponse> {
    const data = await this.repo.getData(clinicId);
    return {
      currentMonth: format(new Date(), "yyyy-MM"),
      kpis: {
        activeGuests: data.activeGuests,
        appointmentsToday: data.appointmentsToday,
        pendingDocuments: data.pendingDocuments,
        missingAssignments: data.missingAssignments,
      },
      upcomingNext7Days: data.upcomingNext7Days,
      arrivingThisMonth: data.arrivingThisMonth,
      todayAppointments: data.todayAppointments,
      monthAppointments: data.monthAppointments,
      pendingGuestDocs: data.pendingGuestDocs,
    };
  }
}
