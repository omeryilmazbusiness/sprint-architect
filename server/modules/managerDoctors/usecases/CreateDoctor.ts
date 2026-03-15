import type { IManagerDoctorsRepo } from "../repos/ManagerDoctorsRepo";
import type { CreateDoctorInput } from "../schemas/managerDoctors.schemas";

export class CreateDoctor {
  constructor(private repo: IManagerDoctorsRepo) {}

  async execute(clinicId: string, input: CreateDoctorInput) {
    return this.repo.createDoctor(clinicId, input);
  }
}
