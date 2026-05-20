import type { Request, Response, NextFunction } from "express";
import { ManagerTransportsRepoDrizzle } from "./repos/ManagerTransportsRepo.drizzle";
import { ListTransports } from "./usecases/ListTransports";
import { CreateTransport } from "./usecases/CreateTransport";
import { UpdateTransport } from "./usecases/UpdateTransport";
import { DeleteTransport } from "./usecases/DeleteTransport";
import { createTransportSchema, updateTransportSchema } from "./schemas/managerTransports.schemas";
import { AppError } from "../../auth/errors";
import { param } from "../../shared/httpParams";

function getClinicId(req: Request): string {
  const clinicId = (req as any).clinicId as string | undefined;
  if (!clinicId) throw new AppError("AUTH_ERR", "Clinic context missing", 401);
  return clinicId;
}

function validateBody<T>(schema: { parse: (v: unknown) => T }, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (err: any) {
    const msg = err?.errors?.[0]?.message ?? "Validation error";
    throw new AppError("TRN-VAL-001", msg, 400);
  }
}

const repo = new ManagerTransportsRepoDrizzle();
const listUC = new ListTransports(repo);
const createUC = new CreateTransport(repo);
const updateUC = new UpdateTransport(repo);
const deleteUC = new DeleteTransport(repo);

export async function handleListTransports(req: Request, res: Response, next: NextFunction) {
  try {
    const clinicId = getClinicId(req);
    const rows = await listUC.execute(clinicId);
    res.json({ rows });
  } catch (e) { next(e); }
}

export async function handleGetTransport(req: Request, res: Response, next: NextFunction) {
  try {
    const clinicId = getClinicId(req);
    const transport = await repo.findById(param(req, "id"), clinicId);
    if (!transport) throw new AppError("TRN-NOT-404", "Transport not found", 404);
    res.json(transport);
  } catch (e) { next(e); }
}

export async function handleCreateTransport(req: Request, res: Response, next: NextFunction) {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(createTransportSchema, req.body);
    const transport = await createUC.execute(clinicId, body);
    res.status(201).json(transport);
  } catch (e) { next(e); }
}

export async function handleUpdateTransport(req: Request, res: Response, next: NextFunction) {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(updateTransportSchema, req.body);
    const transport = await updateUC.execute(param(req, "id"), clinicId, body);
    res.json(transport);
  } catch (e) { next(e); }
}

export async function handleDeleteTransport(req: Request, res: Response, next: NextFunction) {
  try {
    const clinicId = getClinicId(req);
    await deleteUC.execute(param(req, "id"), clinicId);
    res.json({ success: true });
  } catch (e) { next(e); }
}
