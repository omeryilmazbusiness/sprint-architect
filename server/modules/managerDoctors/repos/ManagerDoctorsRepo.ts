export interface IManagerDoctorsRepo {
  hasAppointments(doctorId: string): Promise<boolean>;
  deleteDoctor(doctorId: string, clinicId: string): Promise<boolean>;
}
