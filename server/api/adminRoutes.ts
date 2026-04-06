import { Router } from "express";
import { z } from "zod";
import { authMiddleware, requireRole } from "../auth/middleware";
import { invoiceRepo } from "../repositories/invoiceRepo";
import { clinicRepo } from "../repositories/clinicRepo";
import { userRepo, generateSecurePassword } from "../repositories/userRepo";
import { patientRepo } from "../repositories/patientRepo";
import { credentialRequestRepo } from "../repositories/credentialRequestRepo";
import { notificationRepo } from "../repositories/notificationRepo";
import { deviceTokenRepo } from "../repositories/deviceTokenRepo";
import { AppError } from "../auth/errors";
import { auditLog } from "./auditLogger";
import { db } from "../db";
import { clinics, users, invoices, auditLogs, patients } from "@shared/schema";
import { eq, count, and, desc, lt } from "drizzle-orm";
import { markOverdueInvoicesAsUnpaid } from "../billing/billingService";
import { verifyPassword, hashPassword } from "../auth/password";
import { authRepo } from "../repositories/authRepo";
import { validatePasswordPolicy } from "../auth/passwordPolicy";
import rateLimit from "express-rate-limit";
import { generateTempPassword } from "../utils/generateTempPassword";
import { generatePatientKey, MAX_KEY_ATTEMPTS } from "../utils/patientKey";
import { getEmailProvider } from "../email/getEmailProvider";
import {
  managerPasswordResetEmailHtml,
  managerPasswordResetEmailText,
  guestAccessKeyEmailHtml,
  guestAccessKeyEmailText,
} from "../email/templates";

const changePasswordLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => req.actor?.sub ?? (req.ip ?? "unknown").replace(/^::ffff:/, ""),
  message: { code: "TOO_MANY_ATTEMPTS", message: "Too many password change attempts. Please try again in 10 minutes." },
});

const router = Router();
router.use(authMiddleware, requireRole("ADMIN", "SUPER_ADMIN"));

// ─── Admin Security Endpoints ────────────────────────────────────────────────

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
});

router.post("/auth/change-password", changePasswordLimiter, async (req, res, next) => {
  try {
    const parsed = ChangePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", parsed.error.issues[0].message, 422);
    }
    const { currentPassword, newPassword } = parsed.data;
    const userId = req.actor!.sub;

    const user = await authRepo.findUserById(userId);
    if (!user) throw new AppError("NOT_FOUND", "User not found", 404);

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      auditLog({ actorId: userId, actorRole: "ADMIN", action: "ADMIN_PASSWORD_CHANGE_FAILED", metadata: { reason: "invalid_current_password" } });
      throw new AppError("AUTH_INVALID_CREDENTIALS", "Current password is incorrect", 401);
    }

    validatePasswordPolicy(newPassword, user.email);

    await authRepo.updatePassword(userId, newPassword);
    await authRepo.revokeAllRefreshTokensForUser(userId);
    auditLog({ actorId: userId, actorRole: "ADMIN", action: "ADMIN_PASSWORD_CHANGED", metadata: { email: user.email } });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/auth/logout-all", async (req, res, next) => {
  try {
    const userId = req.actor!.sub;
    await authRepo.revokeAllRefreshTokensForUser(userId);
    auditLog({ actorId: userId, actorRole: "ADMIN", action: "ADMIN_LOGOUT_ALL" });
    res.sendStatus(204);
  } catch (e) {
    next(e);
  }
});

router.get("/audit-logs", async (req, res, next) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) ?? "20"), 100);
    const rows = await db.query.auditLogs.findMany({
      orderBy: desc(auditLogs.createdAt),
      limit,
    });
    res.json(rows.map((r) => ({
      id: r.id,
      action: r.action,
      actorId: r.actorId,
      actorRole: r.actorRole,
      clinicId: r.clinicId,
      resourceType: r.resourceType,
      resourceId: r.resourceId,
      metadata: r.metadata ? JSON.parse(r.metadata) : null,
      createdAt: r.createdAt,
    })));
  } catch (e) {
    next(e);
  }
});

// ─── Notifications — Credential Requests ────────────────────────────────────

router.get("/notifications/unread-count", async (req, res, next) => {
  try {
    const [credentialCount, systemCount] = await Promise.all([
      credentialRequestRepo.countPending(),
      notificationRepo.getAdminUnreadCount(),
    ]);
    res.json({ count: credentialCount + systemCount, credentialCount, systemCount });
  } catch (e) {
    next(e);
  }
});

router.get("/notifications/events", async (req, res, next) => {
  try {
    const { limit, offset } = req.query as Record<string, string>;
    const rows = await notificationRepo.listAdmin(
      limit ? Math.min(parseInt(limit), 100) : 50,
      offset ? parseInt(offset) : 0,
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.put("/notifications/events/:id/read", async (req, res, next) => {
  try {
    const notification = await notificationRepo.markAdminRead(req.params.id);
    if (!notification) throw new AppError("NOT_FOUND", "Notification not found", 404);
    res.json(notification);
  } catch (e) {
    next(e);
  }
});

router.put("/notifications/events/read-all", async (req, res, next) => {
  try {
    await notificationRepo.markAllAdminRead();
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.post("/device-token", async (req, res, next) => {
  try {
    const { token, platform } = z
      .object({ token: z.string().min(1), platform: z.enum(["ios", "android", "web"]) })
      .parse(req.body);

    await deviceTokenRepo.upsert({
      userId: req.actor!.sub,
      role: req.actor!.role,
      clinicId: null,
      token,
      platform,
    });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.delete("/device-token", async (req, res, next) => {
  try {
    const { token } = z.object({ token: z.string().min(1) }).parse(req.body);
    await deviceTokenRepo.delete(token);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.get("/notifications/credential-requests", async (req, res, next) => {
  try {
    const { status, limit } = req.query as Record<string, string>;
    const parsedLimit = limit ? Math.min(parseInt(limit), 100) : 50;
    const rows =
      status === "ALL"
        ? await credentialRequestRepo.listAll({ limit: parsedLimit })
        : await credentialRequestRepo.listPending({ limit: parsedLimit });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

const ResolveSchema = z.object({
  action: z.literal("GENERATE_AND_SEND"),
});

router.post("/credential-requests/:id/resolve", async (req, res, next) => {
  try {
    const parsed = ResolveSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "action must be GENERATE_AND_SEND", 400);
    }

    const cr = await credentialRequestRepo.findById(req.params.id);
    if (!cr) throw new AppError("NOT_FOUND", "Credential request not found", 404);
    if (cr.status !== "PENDING") {
      throw new AppError("VALIDATION_ERROR", "This request has already been resolved", 400);
    }

    const emailProvider = getEmailProvider();
    const adminId = req.actor!.sub;

    console.log(`[credential-resolve] id=${cr.id} kind=${cr.kind} adminId=${adminId}`);

    if (cr.kind === "MANAGER_PASSWORD") {
      if (!cr.targetUser) {
        console.warn(`[credential-resolve] MANAGER_PASSWORD id=${cr.id}: targetUser not found (user deleted?)`);
        throw new AppError("NOT_FOUND", "Target manager account no longer exists", 404);
      }

      const tempPassword = generateTempPassword();
      const passwordHash = await hashPassword(tempPassword);

      await db.update(users)
        .set({ passwordHash, mustChangePassword: true })
        .where(eq(users.id, cr.targetUser.id));

      await authRepo.revokeAllRefreshTokensForUser(cr.targetUser.id);

      const sentToEmail = cr.targetUser.email;
      let emailSent = false;
      try {
        await emailProvider.send({
          to: sentToEmail,
          subject: "HealthTour — Your New Temporary Password",
          html: managerPasswordResetEmailHtml({
            managerEmail: sentToEmail,
            tempPassword,
            clinicName: cr.clinic?.name,
          }),
          text: managerPasswordResetEmailText({
            managerEmail: sentToEmail,
            tempPassword,
            clinicName: cr.clinic?.name,
          }),
        });
        emailSent = true;
        console.log(`[credential-resolve] email sent to ${sentToEmail} for request ${cr.id}`);
      } catch (emailErr: any) {
        console.error(`[credential-resolve] email FAILED for request ${cr.id} to ${sentToEmail}:`, emailErr?.message ?? emailErr);
      }

      await credentialRequestRepo.resolve(cr.id, adminId, { sentToEmail: emailSent ? sentToEmail : undefined });
      auditLog({
        clinicId: cr.clinicId ?? undefined,
        actorId: adminId,
        actorRole: "ADMIN",
        action: "CREDENTIAL_REQUEST_RESOLVED",
        resourceType: "user",
        resourceId: cr.targetUser.id,
        metadata: { kind: "MANAGER_PASSWORD", sentToEmail, emailSent },
      });

      res.json({ success: true, oneTimePassword: tempPassword, emailSent });

    } else if (cr.kind === "GUEST_ACCESS_KEY") {
      if (!cr.targetPatient) {
        console.warn(`[credential-resolve] GUEST_ACCESS_KEY id=${cr.id}: targetPatient not found (patient deleted?)`);
        throw new AppError("NOT_FOUND", "Target patient account no longer exists", 404);
      }

      let newKey = generatePatientKey();
      let attempts = 0;
      while (attempts < MAX_KEY_ATTEMPTS) {
        const existing = await patientRepo.findByKey(newKey);
        if (!existing) break;
        if (++attempts >= MAX_KEY_ATTEMPTS) throw new AppError("INTERNAL", "Failed to generate unique patient key", 500);
        newKey = generatePatientKey();
      }

      await db.update(patients)
        .set({ patientKey: newKey })
        .where(eq(patients.id, cr.targetPatient.id));

      await authRepo.revokeDevice(cr.targetPatient.id);
      await authRepo.revokeAllRefreshTokensForPatient(cr.targetPatient.id);

      const sentToEmail = cr.clinic?.contactEmail ?? cr.requesterEmail ?? null;
      let emailSent = false;
      if (sentToEmail) {
        try {
          await emailProvider.send({
            to: sentToEmail,
            subject: "HealthTour — New Guest Access Key",
            html: guestAccessKeyEmailHtml({
              patientName: cr.targetPatient.fullName,
              accessKey: newKey,
              clinicName: cr.clinic?.name,
            }),
            text: guestAccessKeyEmailText({
              patientName: cr.targetPatient.fullName,
              accessKey: newKey,
              clinicName: cr.clinic?.name,
            }),
          });
          emailSent = true;
          console.log(`[credential-resolve] email sent to ${sentToEmail} for request ${cr.id}`);
        } catch (emailErr: any) {
          console.error(`[credential-resolve] email FAILED for request ${cr.id} to ${sentToEmail}:`, emailErr?.message ?? emailErr);
        }
      } else {
        console.warn(`[credential-resolve] GUEST_ACCESS_KEY id=${cr.id}: no email address available, skipping email`);
      }

      await credentialRequestRepo.resolve(cr.id, adminId, { sentToEmail: emailSent ? (sentToEmail ?? undefined) : undefined });
      auditLog({
        clinicId: cr.clinicId ?? undefined,
        actorId: adminId,
        actorRole: "ADMIN",
        action: "GUEST_ACCESS_KEY_REGENERATED",
        resourceType: "patient",
        resourceId: cr.targetPatient.id,
        metadata: { sentToEmail, emailSent },
      });

      res.json({ success: true, oneTimeAccessKey: newKey, emailSent });
    } else {
      throw new AppError("VALIDATION_ERROR", "Unknown credential request kind", 400);
    }
  } catch (e) {
    next(e);
  }
});

const RejectSchema = z.object({
  reason: z.string().max(500).optional(),
});

router.post("/credential-requests/:id/reject", async (req, res, next) => {
  try {
    RejectSchema.parse(req.body);
    const cr = await credentialRequestRepo.findById(req.params.id);
    if (!cr) throw new AppError("NOT_FOUND", "Credential request not found", 404);
    if (cr.status !== "PENDING") {
      throw new AppError("VALIDATION_ERROR", "This request has already been resolved", 400);
    }
    await credentialRequestRepo.reject(cr.id, req.actor!.sub);
    auditLog({
      clinicId: cr.clinicId ?? undefined,
      actorId: req.actor!.sub,
      actorRole: "ADMIN",
      action: "CREDENTIAL_REQUEST_REJECTED",
      resourceType: cr.kind === "MANAGER_PASSWORD" ? "user" : "patient",
      resourceId: cr.targetUserId ?? cr.targetPatientId ?? undefined,
    });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// ─── Metrics ────────────────────────────────────────────────────────────────

const periodRegex = /^\d{4}-\d{2}$/;
const validatePeriod = (period: string) => {
  if (!periodRegex.test(period)) {
    throw new AppError("VALIDATION_ERROR", "Period must be in YYYY-MM format", 400);
  }
};

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

const CLINIC_SERVICE_CODES = ["RINOPLASTY", "EYE", "DENTAL"] as const;

const ClinicCreateSchema = z.object({
  name: z.string().min(2).max(200),
  address: z.string().min(5).max(500).optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  contactEmail: z.string().email().max(200).optional().nullable(),
  websiteUrl: z.string().url().max(300).optional().nullable(),
  billingEmail: z.string().email().max(200).optional().nullable(),
  services: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  billingUnitPrice: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(2000).optional().nullable(),
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

const ClinicBillingSchema = z.object({
  billingUnitPrice: z.number().nonnegative().nullable(),
  currency: z.string().length(3).optional(),
});

router.put("/clinics/:id/billing", async (req, res, next) => {
  try {
    const parsed = ClinicBillingSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);
    const existing = await clinicRepo.findById(req.params.id);
    if (!existing) throw new AppError("NOT_FOUND", "Clinic not found", 404);
    const updated = await clinicRepo.update(req.params.id, parsed.data);
    auditLog({
      clinicId: req.params.id,
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: "CLINIC_BILLING_UPDATED",
      resourceType: "clinic",
      resourceId: req.params.id,
      metadata: parsed.data,
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

const PrimaryManagerSchema = z.object({
  managerUserId: z.string().nullable(),
});

router.put("/clinics/:id/primary-manager", async (req, res, next) => {
  try {
    const parsed = PrimaryManagerSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);
    const clinic = await clinicRepo.findById(req.params.id);
    if (!clinic) throw new AppError("NOT_FOUND", "Clinic not found", 404);

    if (parsed.data.managerUserId !== null) {
      const mgr = await userRepo.findById(parsed.data.managerUserId);
      if (!mgr || mgr.role !== "MANAGER" || mgr.clinicId !== req.params.id) {
        throw new AppError("VALIDATION_ERROR", "managerUserId must be a MANAGER belonging to this clinic", 400);
      }
    }

    await clinicRepo.setPrimaryManager(req.params.id, parsed.data.managerUserId);
    auditLog({
      clinicId: req.params.id,
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: "CLINIC_PRIMARY_MANAGER_CHANGED",
      resourceType: "clinic",
      resourceId: req.params.id,
      metadata: { managerUserId: parsed.data.managerUserId },
    });
    res.json({ success: true });
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
  fullName: z.string().min(1).max(200).optional(),
  phoneE164: z.string().max(20).optional(),
  role: z.enum(["ADMIN", "MANAGER"]),
  clinicId: z.string().nullable().optional(),
  setAsPrimaryManager: z.boolean().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
});

const UserUpdateSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(1).max(200).nullable().optional(),
  phoneE164: z.string().max(20).nullable().optional(),
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

    const { role, clinicId, setAsPrimaryManager, ...rest } = parsed.data;

    if (role === "MANAGER" && !clinicId) {
      throw new AppError("VALIDATION_ERROR", "MANAGER role requires a clinicId", 400);
    }
    const resolvedClinicId = role === "ADMIN" ? null : (clinicId ?? null);

    const existing = await userRepo.findByEmail(parsed.data.email);
    if (existing) throw new AppError("CONFLICT", "Email already in use", 409);

    const generatedPassword = generateSecurePassword();
    const user = await userRepo.create({
      ...rest,
      role,
      clinicId: resolvedClinicId,
      password: generatedPassword,
      mustChangePassword: true,
    });

    if (role === "MANAGER" && resolvedClinicId && (setAsPrimaryManager !== false)) {
      await clinicRepo.setPrimaryManager(resolvedClinicId, user.id);
    }

    auditLog({
      clinicId: resolvedClinicId ?? undefined,
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: "USER_CREATED",
      resourceType: "user",
      resourceId: user.id,
      metadata: { email: user.email, role: user.role, setAsPrimaryManager },
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
    const generatedPassword = generateTempPassword();
    const passwordHash = await hashPassword(generatedPassword);
    await db.update(users).set({ passwordHash, mustChangePassword: true }).where(eq(users.id, req.params.id));
    await authRepo.revokeAllRefreshTokensForUser(req.params.id);
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
