import type { Request, Response, NextFunction } from "express";
import { ListPatients } from "./usecases/ListPatients";
import { ApprovePatient } from "./usecases/ApprovePatient";
import { ListDocSummaries } from "./usecases/ListDocSummaries";
import { managerPatientsRepo } from "./repos/ManagerPatientsRepo.drizzle";
import { billingEventsRepo } from "../billingEvents/repos/BillingEventsRepo.drizzle";
import { listPatientsQuerySchema } from "./schemas/managerPatients.schemas";
import type { DocSummaryFilter } from "./repos/ManagerPatientsRepo";
import { AppError } from "../../auth/errors";

const listPatientsUseCase = new ListPatients(managerPatientsRepo);
const approvePatientUseCase = new ApprovePatient(managerPatientsRepo, billingEventsRepo);
const listDocSummariesUseCase = new ListDocSummaries(managerPatientsRepo);

export async function handleListPatients(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const clinicId = (req as any).clinicId as string;
    const parsed = listPatientsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(
        "VAL-001",
        parsed.error.issues.map((i) => i.message).join("; "),
        400,
      );
    }

    const { search, page, pageSize, status, pendingDocs, todayAppt } =
      parsed.data;

    const result = await listPatientsUseCase.execute({
      clinicId,
      search,
      page,
      pageSize,
      status,
      pendingDocs,
      todayAppt,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function handleApprovePatient(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const clinicId = (req as any).clinicId as string;
    const actorId = (req as any).user?.id ?? "unknown";
    const actorRole = (req as any).user?.role ?? "MANAGER";
    const { id: patientId } = req.params;

    if (!patientId) {
      throw new AppError("VAL-001", "Patient ID is required", 400);
    }

    const result = await approvePatientUseCase.execute({
      patientId,
      clinicId,
      actorId,
      actorRole,
    });

    res.json({
      success: true,
      alreadyApproved: result.alreadyApproved,
      approvedAt: result.approvedAt,
      billingPeriod: result.billingPeriod,
    });
  } catch (e) {
    next(e);
  }
}

const VALID_DOC_FILTERS: DocSummaryFilter[] = ["ALL", "HAS_PENDING", "FULLY_UPLOADED", "HAS_REJECTED"];

export async function handleListDocSummaries(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const clinicId = (req as any).clinicId as string;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
    const rawFilter = typeof req.query.filter === "string" ? req.query.filter : "ALL";
    const filter: DocSummaryFilter = VALID_DOC_FILTERS.includes(rawFilter as DocSummaryFilter)
      ? (rawFilter as DocSummaryFilter)
      : "ALL";

    const result = await listDocSummariesUseCase.execute({ clinicId, search, filter });
    res.json(result);
  } catch (e) {
    next(e);
  }
}
