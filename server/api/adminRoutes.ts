import { Router } from "express";
import { z } from "zod";
import { authMiddleware, requireRole } from "../auth/middleware";
import { invoiceRepo } from "../repositories/invoiceRepo";
import { clinicRepo } from "../repositories/clinicRepo";
import { userRepo, generateSecurePassword } from "../repositories/userRepo";
import { AppError } from "../auth/errors";
import { auditLog } from "./auditLogger";
import { db } from "../db";
import { clinics, users, invoices } from "@shared/schema";
import { eq, count, and } from "drizzle-orm";
import { markOverdueInvoicesAsUnpaid } from "../billing/billingService";

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
      [{ total: suspendedClinics }],
      [{ total: totalUsers }],
      [{ total: activeUsers }],
      [{ total: pendingInvoices }],
      [{ total: unpaidInvoices }],
      [{ total: paidInvoices }],
      recentClinics,
    ] = await Promise.all([
      db.select({ total: count() }).from(clinics),
      db.select({ total: count() }).from(clinics).where(eq(clinics.status, "ACTIVE")),
      db.select({ total: count() }).from(clinics).where(eq(clinics.status, "SUSPENDED")),
      db.select({ total: count() }).from(users),
      db.select({ total: count() }).from(users).where(eq(users.status, "ACTIVE")),
      db.select({ total: count() }).from(invoices).where(eq(invoices.status, "PENDING")),
      db.select({ total: count() }).from(invoices).where(eq(invoices.status, "UNPAID")),
      db.select({ total: count() }).from(invoices).where(eq(invoices.status, "PAID")),
      db.query.clinics.findMany({ limit: 6, orderBy: (c, { desc }) => desc(c.createdAt) }),
    ]);

    const recentInvoices = await invoiceRepo.list({ pageSize: 5, page: 1 });

    res.json({
      clinics: {
        total: totalClinics,
        active: activeClinics,
        inactive: totalClinics - activeClinics - suspendedClinics,
        suspended: suspendedClinics,
      },
      users: { total: totalUsers, active: activeUsers },
      invoices: { pending: pendingInvoices, unpaid: unpaidInvoices, paid: paidInvoices },
      recentInvoices: recentInvoices.rows,
      recentClinics,
    });
  } catch (e) {
    next(e);
  }
});

// ─── Clinics ────────────────────────────────────────────────────────────────

const ClinicCreateSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  contactEmail: z.string().email().max(200).optional().nullable(),
  services: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  billingUnitPrice: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).optional(),
});

const ClinicUpdateSchema = ClinicCreateSchema.extend({
  billingAnchorDay: z.number().int().min(1).max(28).optional(),
}).partial();

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

router.get("/clinics/:id/detail", async (req, res, next) => {
  try {
    const detail = await clinicRepo.getDetail(req.params.id);
    if (!detail) throw new AppError("NOT_FOUND", "Clinic not found", 404);
    res.json(detail);
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
    const { search, entityType, status, clinicId, page, pageSize } = req.query as Record<string, string>;
    const validEntityTypes = ["ADMIN", "MANAGER", "PATIENT"];
    if (entityType && !validEntityTypes.includes(entityType)) {
      throw new AppError("VALIDATION_ERROR", "entityType must be ADMIN, MANAGER, or PATIENT", 400);
    }
    const result = await userRepo.listUnified({
      search,
      entityType: entityType as "ADMIN" | "MANAGER" | "PATIENT" | undefined,
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

    const generatedPassword = generateSecurePassword();
    const user = await userRepo.create({
      ...parsed.data,
      password: generatedPassword,
      mustChangePassword: true,
    });

    auditLog({
      clinicId: parsed.data.clinicId ?? undefined,
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: "USER_CREATED",
      resourceType: "user",
      resourceId: user.id,
      metadata: { email: user.email, role: user.role },
    });

    res.status(201).json({ ...user, generatedPassword });
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

router.put("/users/:id/reset-password", async (req, res, next) => {
  try {
    const exists = await userRepo.findById(req.params.id);
    if (!exists) throw new AppError("NOT_FOUND", "User not found", 404);
    const generatedPassword = generateSecurePassword();
    await userRepo.setPassword(req.params.id, generatedPassword);
    auditLog({
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: "USER_PASSWORD_RESET",
      resourceType: "user",
      resourceId: req.params.id,
    });
    res.json({ success: true, generatedPassword });
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
// Note: invoice generation is automatic via scheduler only. No manual generate endpoint.

router.post("/billing/run", async (req, res, next) => {
  try {
    await markOverdueInvoicesAsUnpaid();
    res.json({ success: true, message: "Billing overdue check completed" });
  } catch (e) {
    next(e);
  }
});

router.get("/invoices", async (req, res, next) => {
  try {
    const { period, clinicId, status, page, pageSize } = req.query as Record<string, string>;
    if (period) validatePeriod(period);
    if (status && !["PENDING", "UNPAID", "PAID"].includes(status)) {
      throw new AppError("VALIDATION_ERROR", "Status must be PENDING, UNPAID, or PAID", 400);
    }
    const result = await invoiceRepo.list({
      period,
      clinicId,
      status,
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
    });
    res.json(result);
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

const InvoiceStatusSchema = z.object({
  status: z.enum(["PAID"]),
});

router.put("/invoices/:id/status", async (req, res, next) => {
  try {
    const parsed = InvoiceStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Only PAID status is allowed via this endpoint", 400);
    }
    const invoice = await invoiceRepo.findById(req.params.id);
    if (!invoice) throw new AppError("NOT_FOUND", "Invoice not found", 404);
    if (invoice.status === "PAID") {
      throw new AppError("VALIDATION_ERROR", "Invoice is already paid", 400);
    }
    const updated = await invoiceRepo.updateStatus(req.params.id, "PAID", req.actor!.sub);
    auditLog({
      clinicId: updated?.clinicId,
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: "INVOICE_MARKED_PAID",
      resourceType: "invoice",
      resourceId: updated?.id,
      metadata: { previousStatus: invoice.status, paidByUserId: req.actor!.sub },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

export default router;
