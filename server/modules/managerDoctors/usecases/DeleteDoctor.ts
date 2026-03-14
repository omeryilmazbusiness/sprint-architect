import { AppError } from "../../../auth/errors";
import type { IManagerDoctorsRepo } from "../repos/ManagerDoctorsRepo";

export class DeleteDoctor {
  constructor(private readonly repo: IManagerDoctorsRepo) {}

  async execute(doctorId: string, clinicId: string): Promise<void> {
    const hasAppts = await this.repo.hasAppointments(doctorId);
    if (hasAppts) {
      throw new AppError(
        "DOC-DEL-001",
        "Doctor cannot be deleted because appointments exist.",
        409,
      );
    }

    const deleted = await this.repo.deleteDoctor(doctorId, clinicId);
    if (!deleted) {
      throw new AppError("NOT-001", "Doctor not found", 404);
    }
  }
}
