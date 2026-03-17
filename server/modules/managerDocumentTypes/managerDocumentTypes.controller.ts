import type { Request, Response, NextFunction } from "express";
import { ManagerDocumentTypesRepoDrizzle } from "./repos/ManagerDocumentTypesRepo.drizzle";
import { ListDocumentTypes } from "./usecases/ListDocumentTypes";
import { CreateDocumentType } from "./usecases/CreateDocumentType";
import { DeleteDocumentType } from "./usecases/DeleteDocumentType";
import {
  listDocumentTypesQuerySchema,
  createDocumentTypeBodySchema,
} from "./schemas/managerDocumentTypes.schemas";
import { AppError } from "../../auth/errors";
import { auditLog } from "../../api/auditLogger";

function getClinicId(req: Request): string {
  const clinicId = (req as any).clinicId as string | undefined;
  if (!clinicId) throw new AppError("AUTH_ERR", "Clinic context missing", 401);
  return clinicId;
}

function getActorId(req: Request): string {
  return (req as any).user?.id ?? "unknown";
}

function getActorRole(req: Request): string {
  return (req as any).user?.role ?? "manager";
}

function validateBody<T>(schema: { parse: (v: unknown) => T }, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (err: any) {
    const msg = err?.errors?.[0]?.message ?? "Validation error";
    throw new AppError("DOC-VAL-001", msg, 400);
  }
}

function validateQuery<T>(schema: { parse: (v: unknown) => T }, query: unknown): T {
  try {
    return schema.parse(query);
  } catch {
    return schema.parse({});
  }
}

const repo = new ManagerDocumentTypesRepoDrizzle();
const listUC = new ListDocumentTypes(repo);
const createUC = new CreateDocumentType(repo);
const deleteUC = new DeleteDocumentType(repo);

export async function listDocumentTypes(req: Request, res: Response, next: NextFunction) {
  try {
    const clinicId = getClinicId(req);
    const { search } = validateQuery(listDocumentTypesQuerySchema, req.query);
    const result = await listUC.execute(clinicId, search);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function createDocumentType(req: Request, res: Response, next: NextFunction) {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(createDocumentTypeBodySchema, req.body);
    const dt = await createUC.execute(clinicId, body.name, body.note);
    auditLog({
      clinicId,
      actorId: getActorId(req),
      actorRole: getActorRole(req),
      action: "DOC_TYPE_CREATE",
      resourceType: "document_type",
      resourceId: dt.id,
      metadata: { name: dt.name },
    });
    res.status(201).json(dt);
  } catch (e) {
    next(e);
  }
}

export async function deleteDocumentType(req: Request, res: Response, next: NextFunction) {
  try {
    const clinicId = getClinicId(req);
    const { id } = req.params;
    const dt = await deleteUC.execute(id, clinicId);
    auditLog({
      clinicId,
      actorId: getActorId(req),
      actorRole: getActorRole(req),
      action: "DOC_TYPE_DELETE",
      resourceType: "document_type",
      resourceId: id,
      metadata: { name: dt.name },
    });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}
