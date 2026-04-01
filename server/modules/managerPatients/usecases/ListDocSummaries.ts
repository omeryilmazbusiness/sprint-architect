import type {
  IManagerPatientsRepo,
  DocSummaryItem,
  ListDocSummariesFilter,
} from "../repos/ManagerPatientsRepo";

export class ListDocSummaries {
  constructor(private readonly repo: IManagerPatientsRepo) {}

  async execute(filter: ListDocSummariesFilter): Promise<DocSummaryItem[]> {
    return this.repo.listDocSummaries(filter);
  }
}
