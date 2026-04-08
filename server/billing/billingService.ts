import { db } from "../db";
import { logger } from "../shared/logger";
import { clinics, invoices, patients, users } from "@shared/schema";
import { eq, and, lt, not, gte, isNotNull, or, inArray, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { auditLog } from "../api/auditLogger";
import { getEmailProvider } from "../email/getEmailProvider";
import { invoiceEmailHtml, invoiceEmailText, monthlyReportHtml, monthlyReportText } from "../email/templates";
import { getPeriodBoundaries, BILLABLE_STATUSES } from "./billingCalculator";
import { notificationService } from "../services/NotificationService";

const ISTANBUL_TZ = "Europe/Istanbul";

function toIstanbul(date: Date): Date {
  const formatted = date.toLocaleString("en-US", { timeZone: ISTANBUL_TZ });
  return new Date(formatted);
}

export function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function isLastDayOfMonth(): boolean {
  const now = toIstanbul(new Date());
  const lastDay = getLastDayOfMonth(now.getFullYear(), now.getMonth() + 1);
  return now.getDate() === lastDay;
}

export function computeLastDayDueAt(year: number, month: number): Date {
  const lastDay = getLastDayOfMonth(year, month);
  const dueAtLocal = new Date(year, month - 1, lastDay, 23, 59, 59, 0);
  return dueAtLocal;
}

export function currentPeriod(): string {
  const now = toIstanbul(new Date());
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function previousPeriod(): string {
  const now = toIstanbul(new Date());
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function isFirstDayOfMonth(): boolean {
  const now = toIstanbul(new Date());
  return now.getDate() === 1;
}

export function computeNextInvoiceDate(billingAnchorDay: number): Date {
  const today = new Date();
  const anchorThisMonth = new Date(today.getFullYear(), today.getMonth(), billingAnchorDay);
  if (today.getDate() >= billingAnchorDay) {
    return new Date(today.getFullYear(), today.getMonth() + 1, billingAnchorDay);
  }
  return anchorThisMonth;
}

export async function generatePendingInvoicesForPeriod(period: string): Promise<typeof invoices.$inferSelect[]> {
  const allClinics = await db.query.clinics.findMany({
    where: not(eq(clinics.status, "INACTIVE")),
  });
  const generatedInvoices: (typeof invoices.$inferSelect)[] = [];
  const emailProvider = getEmailProvider();

  const { periodStart, periodEnd, startDate, endDate } = getPeriodBoundaries(period);
  const dueAt = computeLastDayDueAt(...period.split("-").map(Number) as [number, number]);

  for (const clinic of allClinics) {
    const existing = await db.query.invoices.findFirst({
      where: and(eq(invoices.clinicId, clinic.id), eq(invoices.period, period)),
    });
    if (existing && existing.status === "PAID") continue;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(patients)
      .where(
        and(
          eq(patients.clinicId, clinic.id),
          inArray(patients.status, [...BILLABLE_STATUSES]),
          or(
            and(
              isNotNull(patients.arrivalDate),
              sql`${patients.arrivalDate} >= ${periodStart}`,
              sql`${patients.arrivalDate} < ${periodEnd}`
            ),
            and(
              isNull(patients.arrivalDate),
              gte(patients.createdAt, startDate),
              lt(patients.createdAt, endDate)
            )
          )
        )
      );

    const [{ fallbackCount }] = await db
      .select({ fallbackCount: sql<number>`count(*)::int` })
      .from(patients)
      .where(
        and(
          eq(patients.clinicId, clinic.id),
          inArray(patients.status, [...BILLABLE_STATUSES]),
          isNull(patients.arrivalDate),
          gte(patients.createdAt, startDate),
          lt(patients.createdAt, endDate)
        )
      );
    if (fallbackCount > 0) {
      logger.warn("[billing] patients missing arrivalDate, using createdAt fallback", {
        clinicId: clinic.id, period, count: fallbackCount,
      });
    }

    const unitPrice = clinic.billingUnitPrice ?? parseFloat(process.env.DEFAULT_UNIT_PRICE ?? "50");
    const total = count * unitPrice;
    const now = new Date();

    let invoice;
    if (existing) {
      [invoice] = await db
        .update(invoices)
        .set({
          patientCount: count,
          unitPrice,
          total,
          currency: clinic.currency,
          issuedAt: now,
          dueAt,
        } as any)
        .where(eq(invoices.id, existing.id))
        .returning();
    } else {
      [invoice] = await db
        .insert(invoices)
        .values({
          clinicId: clinic.id,
          period,
          patientCount: count,
          unitPrice,
          total,
          currency: clinic.currency,
          status: "PENDING",
          issuedAt: now,
          dueAt,
        })
        .returning();
    }
    generatedInvoices.push(invoice);

    auditLog({
      clinicId: clinic.id,
      actorId: "system",
      actorRole: "SYSTEM",
      action: "invoice.generated",
      metadata: { period, patientCount: count, total, unitPrice, dueAt },
    });

    // Send invoice email to clinic (idempotent: only if not already emailed)
    const alreadyEmailed = existing?.emailedAt != null;
    if (clinic.contactEmail && !alreadyEmailed) {
      try {
        await emailProvider.send({
          to: clinic.contactEmail,
          subject: `Your Monthly Invoice – ${period} – ${clinic.name}`,
          html: invoiceEmailHtml({ clinicName: clinic.name, period, patientCount: count, unitPrice, total, currency: clinic.currency, dueAt }),
          text: invoiceEmailText({ clinicName: clinic.name, period, patientCount: count, unitPrice, total, currency: clinic.currency, dueAt }),
        });
        await db
          .update(invoices)
          .set({ emailedAt: new Date(), emailedTo: clinic.contactEmail } as any)
          .where(eq(invoices.id, invoice.id));
        logger.info("[billing] invoice email sent", { clinicId: clinic.id, email: clinic.contactEmail });
      } catch (err) {
        logger.error("[billing] invoice email failed", { clinicId: clinic.id, error: String(err) });
      }
    }
  }

  if (generatedInvoices.length > 0) {
    notificationService.emitAdminNotification({
      type: "INVOICE_GENERATED",
      title: "Invoices Generated",
      body: `${generatedInvoices.length} invoice(s) generated for period ${period}.`,
      severity: "INFO",
      metadata: { period, invoiceCount: generatedInvoices.length },
    }).catch(() => {});
  }

  return generatedInvoices;
}

export async function sendMonthlyReport(): Promise<void> {
  const period = previousPeriod();
  const emailProvider = getEmailProvider();
  const reportEmail = process.env.MONTHLY_REPORT_EMAIL ?? "ryilmazomer@gmail.com";

  const [periodInvoices, suspendedResult] = await Promise.all([
    db.query.invoices.findMany({ where: eq(invoices.period, period), with: { clinic: true } }),
    db.select({ count: sql<number>`count(*)::int` }).from(clinics).where(eq(clinics.status, "SUSPENDED")),
  ]);

  const paid = periodInvoices.filter((i) => i.status === "PAID").length;
  const unpaid = periodInvoices.filter((i) => i.status === "UNPAID").length;
  const pending = periodInvoices.filter((i) => i.status === "PENDING").length;
  const suspendedClinics = suspendedResult[0]?.count ?? 0;

  const rows = periodInvoices.map((inv) => ({
    clinicName: (inv as any).clinic?.name ?? inv.clinicId,
    invoiceStatus: inv.status,
    clinicStatus: (inv as any).clinic?.status ?? "UNKNOWN",
    total: inv.total,
    currency: inv.currency,
  }));

  const data = { period, totalInvoices: periodInvoices.length, paid, unpaid, pending, suspendedClinics, rows };

  await emailProvider.send({
    to: reportEmail,
    subject: `HealthTour Monthly Status Report – ${period}`,
    html: monthlyReportHtml(data),
    text: monthlyReportText(data),
  });

  auditLog({
    actorId: "system",
    actorRole: "SYSTEM",
    action: "MONTHLY_REPORT_SENT",
    metadata: { period, totalInvoices: periodInvoices.length, paid, unpaid, pending, suspendedClinics },
  });

  logger.info("[billing] monthly report sent", { period, reportEmail });
}

export async function markOverdueInvoicesAsUnpaid(): Promise<void> {
  const now = new Date();

  const overdueInvoices = await db.query.invoices.findMany({
    where: and(
      eq(invoices.status, "PENDING"),
      isNotNull(invoices.dueAt),
      lt(invoices.dueAt as any, now)
    ),
  });

  if (overdueInvoices.length === 0) return;

  const clinicIdsToSuspend = [...new Set(overdueInvoices.map((i) => i.clinicId))];

  await db.transaction(async (trx) => {
    for (const inv of overdueInvoices) {
      await trx.update(invoices).set({ status: "UNPAID" }).where(eq(invoices.id, inv.id));
    }

    for (const clinicId of clinicIdsToSuspend) {
      await trx
        .update(clinics)
        .set({ status: "SUSPENDED", statusReason: "BILLING_UNPAID" } as any)
        .where(eq(clinics.id, clinicId));

      await trx
        .update(users)
        .set({ status: "SUSPENDED", statusReason: "BILLING_SUSPENDED" } as any)
        .where(
          and(
            eq(users.clinicId, clinicId),
            or(eq(users.role, "MANAGER"), eq(users.role, "PATIENT"))
          )
        );
    }
  });

  for (const clinicId of clinicIdsToSuspend) {
    const clinicOverdueInvoices = overdueInvoices.filter((i) => i.clinicId === clinicId);
    auditLog({
      clinicId,
      actorId: "system",
      actorRole: "SYSTEM",
      action: "clinic.suspended_unpaid_invoice",
      metadata: {
        invoiceIds: clinicOverdueInvoices.map((i) => i.id),
      },
    });

    notificationService.emitAdminNotification({
      type: "CLINIC_SUSPENDED",
      title: "Clinic Suspended",
      body: `A clinic has been suspended due to ${clinicOverdueInvoices.length} unpaid invoice(s).`,
      severity: "CRITICAL",
      relatedId: clinicId,
      relatedType: "clinic",
      metadata: {
        clinicId,
        invoiceIds: clinicOverdueInvoices.map((i) => i.id),
        invoiceCount: clinicOverdueInvoices.length,
      },
    }).catch(() => {});
  }
}

export async function reactivateClinicAfterPayment(clinicId: string, paidByUserId?: string): Promise<void> {
  await db.transaction(async (trx) => {
    await trx
      .update(clinics)
      .set({ status: "ACTIVE", statusReason: null } as any)
      .where(eq(clinics.id, clinicId));

    await trx
      .update(users)
      .set({ status: "ACTIVE", statusReason: null } as any)
      .where(
        and(
          eq(users.clinicId, clinicId),
          or(eq(users.role, "MANAGER"), eq(users.role, "PATIENT"))
        )
      );
  });

  auditLog({
    clinicId,
    actorId: paidByUserId ?? "system",
    actorRole: paidByUserId ? "ADMIN" : "SYSTEM",
    action: "clinic.reactivated_after_payment",
  });
}

export async function checkAndSuspendOverdue(): Promise<void> {
  await markOverdueInvoicesAsUnpaid();
}

export async function runBillingCycle(targetClinicIds?: string[]): Promise<void> {
  try {
    await checkAndSuspendOverdue();
  } catch (err) {
    logger.error("[billing] runBillingCycle error", { error: String(err) });
  }
}
