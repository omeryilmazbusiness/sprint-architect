import { format } from "date-fns";
import type { IManagerAppointmentsRepo } from "../repos/ManagerAppointmentsRepo";
import type { TodayAppointmentsResponse } from "../schemas/managerAppointments.schemas";

export class GetTodayAppointments {
  constructor(private readonly repo: IManagerAppointmentsRepo) {}

  async execute(clinicId: string): Promise<TodayAppointmentsResponse> {
    const items = await this.repo.getTodayAppointments(clinicId);
    return {
      date: format(new Date(), "yyyy-MM-dd"),
      items,
    };
  }
}
