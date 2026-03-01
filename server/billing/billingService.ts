import { db } from "../db";
import { clinics, invoices, patients, users } from "@shared/schema";
import { eq, and, lt, not, gte, inArray, isNotNull, or } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { auditLog } from "../api/auditLogger";

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
  const generatedInvoices = [];

  const [year, month] = period.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  const dueAt = computeLastDayDueAt(year, month);

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
          gte(patients.createdAt, startDate),
          lt(patients.createdAt, endDate)
        )
      );

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
  }

  return generatedInvoices;
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

  for (const inv of overdueInvoices) {
    await db.update(invoices).set({ status: "UNPAID" }).where(eq(invoices.id, inv.id));
  }

  for (const clinicId of clinicIdsToSuspend) {
    await db
      .update(clinics)
      .set({ status: "SUSPENDED", statusReason: "BILLING_UNPAID" } as any)
      .where(eq(clinics.id, clinicId));

    await db
      .update(users)
      .set({ status: "SUSPENDED", statusReason: "BILLING_SUSPENDED" } as any)
      .where(
        and(
          eq(users.clinicId, clinicId),
          or(eq(users.role, "MANAGER"), eq(users.role, "PATIENT"))
        )
      );

    auditLog({
      clinicId,
      actorId: "system",
      actorRole: "SYSTEM",
      action: "clinic.suspended_unpaid_invoice",
      metadata: {
        invoiceIds: overdueInvoices.filter((i) => i.clinicId === clinicId).map((i) => i.id),
      },
    });
  }
}

export async function reactivateClinicAfterPayment(clinicId: string, paidByUserId?: string): Promise<void> {
  await db
    .update(clinics)
    .set({ status: "ACTIVE", statusReason: null } as any)
    .where(eq(clinics.id, clinicId));

  await db
    .update(users)
    .set({ status: "ACTIVE", statusReason: null } as any)
    .where(
      and(
        eq(users.clinicId, clinicId),
        or(eq(users.role, "MANAGER"), eq(users.role, "PATIENT"))
      )
    );

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
    console.error("[billing] runBillingCycle error:", err);
  }
}
