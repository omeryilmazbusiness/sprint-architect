import type { IManagerPatientsRepo, ApprovePatientInput, ApprovePatientResult } from "../repos/ManagerPatientsRepo";
import type { IBillingEventsRepo } from "../../billingEvents/repos/BillingEventsRepo";
import { auditLog } from "../../../api/auditLogger";

export class ApprovePatient {
  constructor(
    private readonly repo: IManagerPatientsRepo,
    private readonly billingEventsRepo: IBillingEventsRepo
  ) {}

  async execute(input: ApprovePatientInput): Promise<ApprovePatientResult> {
    const result = await this.repo.approvePatient(input);

    await this.billingEventsRepo.upsert({
      clinicId: input.clinicId,
      patientId: input.patientId,
      period: result.billingPeriod,
    });

    auditLog({
      clinicId: input.clinicId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: result.alreadyApproved ? "patient.approve.noop" : "patient.approved",
      resourceType: "patient",
      resourceId: input.patientId,
      metadata: { billingPeriod: result.billingPeriod, alreadyApproved: result.alreadyApproved },
    });

    return result;
  }
}
