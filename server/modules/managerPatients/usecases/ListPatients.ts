import type {
  IManagerPatientsRepo,
  ListPatientsFilter,
  PatientListResult,
} from "../repos/ManagerPatientsRepo";

export class ListPatients {
  constructor(private readonly repo: IManagerPatientsRepo) {}

  async execute(filter: ListPatientsFilter): Promise<PatientListResult> {
    return this.repo.listPatients(filter);
  }
}
