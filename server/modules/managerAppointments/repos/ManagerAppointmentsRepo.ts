import type { TodayAppointmentItem } from "../schemas/managerAppointments.schemas";

export interface IManagerAppointmentsRepo {
  getTodayAppointments(clinicId: string): Promise<TodayAppointmentItem[]>;
}
