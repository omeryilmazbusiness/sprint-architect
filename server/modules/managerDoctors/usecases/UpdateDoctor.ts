import type { IManagerDoctorsRepo } from "../repos/ManagerDoctorsRepo";
import type { UpdateDoctorInput } from "../schemas/managerDoctors.schemas";
import { AppError } from "../../../auth/errors";

export class UpdateDoctor {
  constructor(private repo: IManagerDoctorsRepo) {}

  async execute(doctorId: string, clinicId: string, input: UpdateDoctorInput) {
    const updated = await this.repo.updateDoctor(doctorId, clinicId, input);
    if (!updated) throw new AppError("NOT-FOUND", "Doctor not found", 404);
    return updated;
  }
}
