import { Router } from "express";
import { z } from "zod";
import { authMiddleware, requireRole } from "../auth/middleware";
import { invoiceRepo } from "../repositories/invoiceRepo";
import { AppError } from "../auth/errors";
import { auditLog } from "./auditLogger";

const router = Router();

router.use(authMiddleware, requireRole("ADMIN"));

const periodRegex = /^\d{4}-\d{2}$/;
const validatePeriod = (period: string) => {
  if (!periodRegex.test(period)) {
    throw new AppError("VALIDATION_ERROR", "Period must be in YYYY-MM format", 400);
  }
};

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
    const filters: any = { period, clinicId, status };
    const invoices = await invoiceRepo.list(filters);
    res.json(invoices);
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
