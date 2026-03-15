import type { IManagerDoctorsRepo } from "../repos/ManagerDoctorsRepo";

export class ListDoctors {
  constructor(private repo: IManagerDoctorsRepo) {}

  async execute(clinicId: string, search?: string) {
    return this.repo.listDoctors(clinicId, search?.trim() || undefined);
  }
}
