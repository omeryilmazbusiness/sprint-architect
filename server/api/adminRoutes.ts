import { Router } from "express";
import { z } from "zod";
import { authMiddleware, requireRole } from "../auth/middleware";
import { invoiceRepo } from "../repositories/invoiceRepo";
import { clinicRepo } from "../repositories/clinicRepo";
import { userRepo } from "../repositories/userRepo";
import { AppError } from "../auth/errors";
import { auditLog } from "./auditLogger";
import { db } from "../db";
import { clinics, users, invoices } from "@shared/schema";
import { eq, count, and } from "drizzle-orm";

const router = Router();
router.use(authMiddleware, requireRole("ADMIN"));

const periodRegex = /^\d{4}-\d{2}$/;
const validatePeriod = (period: string) => {
  if (!periodRegex.test(period)) {
    throw new AppError("VALIDATION_ERROR", "Period must be in YYYY-MM format", 400);
  }
};

// ─── Metrics ────────────────────────────────────────────────────────────────

router.get("/metrics", async (req, res, next) => {
  try {
    const [
      [{ total: totalClinics }],
      [{ total: activeClinics }],
      [{ total: totalUsers }],
      [{ total: activeUsers }],
      [{ total: draftInvoices }],
      [{ total: issuedInvoices }],
      [{ total: paidInvoices }],
    ] = await Promise.all([
      db.select({ total: count() }).from(clinics),
      db.select({ total: count() }).from(clinics).where(eq(clinics.status, "ACTIVE")),
      db.select({ total: count() }).from(users),
      db.select({ total: count() }).from(users).where(eq(users.status, "ACTIVE")),
      db.select({ total: count() }).from(invoices).where(eq(invoices.status, "DRAFT")),
      db.select({ total: count() }).from(invoices).where(eq(invoices.status, "ISSUED")),
      db.select({ total: count() }).from(invoices).where(eq(invoices.status, "PAID")),
    ]);
    res.json({
      clinics: { total: totalClinics, active: activeClinics, inactive: totalClinics - activeClinics },
      users: { total: totalUsers, active: activeUsers },
      invoices: { draft: draftInvoices, issued: issuedInvoices, paid: paidInvoices },
    });
  } catch (e) {
    next(e);
  }
});

// ─── Clinics ────────────────────────────────────────────────────────────────

const ClinicCreateSchema = z.object({
  name: z.string().min(1).max(200),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  billingUnitPrice: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).optional(),
});

const ClinicUpdateSchema = ClinicCreateSchema.partial();

router.get("/clinics", async (req, res, next) => {
  try {
    const { search, status, page, pageSize } = req.query as Record<string, string>;
    const result = await clinicRepo.list({
      search,
      status,
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post("/clinics", async (req, res, next) => {
  try {
    const parsed = ClinicCreateSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);
    const clinic = await clinicRepo.create(parsed.data);
    auditLog({
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: "CLINIC_CREATED",
      resourceType: "clinic",
      resourceId: clinic.id,
      metadata: { name: clinic.name },
    });
    res.status(201).json(clinic);
  } catch (e) {
    next(e);
  }
});

router.get("/clinics/:id", async (req, res, next) => {
  try {
    const clinic = await clinicRepo.findById(req.params.id);
    if (!clinic) throw new AppError("NOT_FOUND", "Clinic not found", 404);
    res.json(clinic);
  } catch (e) {
    next(e);
  }
});

router.put("/clinics/:id", async (req, res, next) => {
  try {
    const parsed = ClinicUpdateSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);
    const existing = await clinicRepo.findById(req.params.id);
    if (!existing) throw new AppError("NOT_FOUND", "Clinic not found", 404);
    const updated = await clinicRepo.update(req.params.id, parsed.data);
    auditLog({
      clinicId: req.params.id,
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: "CLINIC_UPDATED",
      resourceType: "clinic",
      resourceId: req.params.id,
      metadata: parsed.data,
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.delete("/clinics/:id", async (req, res, next) => {
  try {
    const existing = await clinicRepo.findById(req.params.id);
    if (!existing) throw new AppError("NOT_FOUND", "Clinic not found", 404);
    await clinicRepo.softDelete(req.params.id);
    auditLog({
      clinicId: req.params.id,
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: "CLINIC_DEACTIVATED",
      resourceType: "clinic",
      resourceId: req.params.id,
    });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// ─── Users ──────────────────────────────────────────────────────────────────

const UserCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "MANAGER"]),
  clinicId: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
});

const UserUpdateSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "MANAGER"]).optional(),
  clinicId: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
});

const PasswordResetSchema = z.object({
  password: z.string().min(8),
});

router.get("/users", async (req, res, next) => {
  try {
    const { search, role, status, clinicId, page, pageSize } = req.query as Record<string, string>;
    const result = await userRepo.list({
      search,
      role,
      status,
      clinicId,
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post("/users", async (req, res, next) => {
  try {
    const parsed = UserCreateSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);
    if (parsed.data.role === "MANAGER" && !parsed.data.clinicId) {
      throw new AppError("VALIDATION_ERROR", "MANAGER role requires a clinicId", 400);
    }
    const existing = await userRepo.findByEmail(parsed.data.email);
    if (existing) throw new AppError("CONFLICT", "Email already in use", 409);
    const user = await userRepo.create(parsed.data);
    auditLog({
      clinicId: parsed.data.clinicId ?? undefined,
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: "USER_CREATED",
      resourceType: "user",
      resourceId: user.id,
      metadata: { email: user.email, role: user.role },
    });
    res.status(201).json(user);
  } catch (e) {
    next(e);
  }
});

router.get("/users/:id", async (req, res, next) => {
  try {
    const user = await userRepo.findById(req.params.id);
    if (!user) throw new AppError("NOT_FOUND", "User not found", 404);
    res.json(user);
  } catch (e) {
    next(e);
  }
});

router.put("/users/:id", async (req, res, next) => {
  try {
    const parsed = UserUpdateSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);
    const existing = await userRepo.findById(req.params.id);
    if (!existing) throw new AppError("NOT_FOUND", "User not found", 404);
    if (parsed.data.role === "MANAGER" && parsed.data.clinicId === null) {
      throw new AppError("VALIDATION_ERROR", "MANAGER role requires a clinicId", 400);
    }
    if (parsed.data.email && parsed.data.email !== existing.email) {
      const taken = await userRepo.findByEmail(parsed.data.email);
      if (taken) throw new AppError("CONFLICT", "Email already in use", 409);
    }
    const updated = await userRepo.update(req.params.id, parsed.data);
    auditLog({
      clinicId: updated?.clinicId ?? undefined,
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: "USER_UPDATED",
      resourceType: "user",
      resourceId: req.params.id,
      metadata: parsed.data,
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.put("/users/:id/password", async (req, res, next) => {
  try {
    const parsed = PasswordResetSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);
    const exists = await userRepo.findById(req.params.id);
    if (!exists) throw new AppError("NOT_FOUND", "User not found", 404);
    await userRepo.setPassword(req.params.id, parsed.data.password);
    auditLog({
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: "USER_PASSWORD_RESET",
      resourceType: "user",
      resourceId: req.params.id,
    });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    const exists = await userRepo.findById(req.params.id);
    if (!exists) throw new AppError("NOT_FOUND", "User not found", 404);
    const updated = await userRepo.softDelete(req.params.id);
    auditLog({
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: "USER_DEACTIVATED",
      resourceType: "user",
      resourceId: req.params.id,
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// ─── Invoices ────────────────────────────────────────────────────────────────

router.post("/invoices/generate", async (req, res, next) => {
  try {
    const { period } = req.query as { period: string };
    if (!period) throw new AppError("VALIDATION_ERROR", "Period is required", 400);
    validatePeriod(period);
    const generated = await invoiceRepo.generateForPeriod(period);
    auditLog({
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: "INVOICE_GENERATED",
      metadata: { period, count: generated.length },
    });
    res.json(generated);
  } catch (e) {
    next(e);
  }
});

router.get("/invoices", async (req, res, next) => {
  try {
    const { period, clinicId, status } = req.query as Record<string, string>;
    if (period) validatePeriod(period);
    const rows = await invoiceRepo.list({ period, clinicId, status });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.get("/invoices/:id", async (req, res, next) => {
  try {
    const invoice = await invoiceRepo.findById(req.params.id);
    if (!invoice) throw new AppError("NOT_FOUND", "Invoice not found", 404);
    res.json(invoice);
  } catch (e) {
    next(e);
  }
});

router.put("/invoices/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body as { status: "DRAFT" | "ISSUED" | "PAID" };
    if (!["DRAFT", "ISSUED", "PAID"].includes(status)) {
      throw new AppError("VALIDATION_ERROR", "Invalid status", 400);
    }
    const updated = await invoiceRepo.updateStatus(req.params.id, status);
    if (!updated) throw new AppError("NOT_FOUND", "Invoice not found", 404);
    auditLog({
      clinicId: updated.clinicId,
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: "INVOICE_STATUS_CHANGED",
      resourceType: "invoice",
      resourceId: updated.id,
      metadata: { status },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

export default router;
