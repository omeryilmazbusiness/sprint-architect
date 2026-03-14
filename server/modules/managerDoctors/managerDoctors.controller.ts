import type { Request, Response, NextFunction } from "express";
import { DeleteDoctor } from "./usecases/DeleteDoctor";
import { managerDoctorsRepo } from "./repos/ManagerDoctorsRepo.drizzle";
import { doctorIdParamSchema } from "./schemas/managerDoctors.schemas";
import { AppError } from "../../auth/errors";
import { auditLog } from "../../api/auditLogger";

const deleteDoctorUseCase = new DeleteDoctor(managerDoctorsRepo);

export async function handleDeleteDoctor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const clinicId = (req as any).clinicId as string;
    const parsed = doctorIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      throw new AppError("VAL-001", "Invalid doctor ID", 400);
    }

    await deleteDoctorUseCase.execute(parsed.data.id, clinicId);

    auditLog({
      clinicId,
      actorId: (req as any).actor?.sub,
      actorRole: (req as any).actor?.role,
      action: "MANAGER_DOCTOR_DELETED",
      resourceType: "doctor",
      resourceId: parsed.data.id,
    });

    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
