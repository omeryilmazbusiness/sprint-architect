import type { Request, Response, NextFunction } from "express";
import { DeleteDoctor } from "./usecases/DeleteDoctor";
import { ListDoctors } from "./usecases/ListDoctors";
import { CreateDoctor } from "./usecases/CreateDoctor";
import { UpdateDoctor } from "./usecases/UpdateDoctor";
import { managerDoctorsRepo } from "./repos/ManagerDoctorsRepo.drizzle";
import {
  doctorIdParamSchema,
  createDoctorSchema,
  updateDoctorSchema,
} from "./schemas/managerDoctors.schemas";
import { AppError } from "../../auth/errors";
import { auditLog } from "../../api/auditLogger";

const listDoctorsUseCase = new ListDoctors(managerDoctorsRepo);
const createDoctorUseCase = new CreateDoctor(managerDoctorsRepo);
const updateDoctorUseCase = new UpdateDoctor(managerDoctorsRepo);
const deleteDoctorUseCase = new DeleteDoctor(managerDoctorsRepo);

export async function handleListDoctors(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const clinicId = (req as any).clinicId as string;
    const search = (req.query.search as string) || "";
    const result = await listDoctorsUseCase.execute(clinicId, search);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function handleCreateDoctor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const clinicId = (req as any).clinicId as string;
    const parsed = createDoctorSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join(", ");
      throw new AppError("VAL-002", msg, 400);
    }

    const doctor = await createDoctorUseCase.execute(clinicId, parsed.data);

    auditLog({
      clinicId,
      actorId: (req as any).actor?.sub,
      actorRole: (req as any).actor?.role,
      action: "MANAGER_DOCTOR_CREATED",
      resourceType: "doctor",
      resourceId: doctor.id,
    });

    res.status(201).json(doctor);
  } catch (e) {
    next(e);
  }
}

export async function handleUpdateDoctor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const clinicId = (req as any).clinicId as string;
    const paramParsed = doctorIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
      throw new AppError("VAL-001", "Invalid doctor ID", 400);
    }

    const bodyParsed = updateDoctorSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      const msg = bodyParsed.error.errors.map((e) => e.message).join(", ");
      throw new AppError("VAL-002", msg, 400);
    }

    const doctor = await updateDoctorUseCase.execute(
      paramParsed.data.id,
      clinicId,
      bodyParsed.data,
    );

    auditLog({
      clinicId,
      actorId: (req as any).actor?.sub,
      actorRole: (req as any).actor?.role,
      action: "MANAGER_DOCTOR_UPDATED",
      resourceType: "doctor",
      resourceId: doctor.id,
    });

    res.json(doctor);
  } catch (e) {
    next(e);
  }
}

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
