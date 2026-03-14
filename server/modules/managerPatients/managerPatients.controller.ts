import type { Request, Response, NextFunction } from "express";
import { ListPatients } from "./usecases/ListPatients";
import { managerPatientsRepo } from "./repos/ManagerPatientsRepo.drizzle";
import { listPatientsQuerySchema } from "./schemas/managerPatients.schemas";
import { AppError } from "../../auth/errors";

const listPatientsUseCase = new ListPatients(managerPatientsRepo);

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
