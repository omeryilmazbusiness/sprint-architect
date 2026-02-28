import { db } from "../db";
import { clinics, invoices, patients } from "@shared/schema";
import { eq, and, lt, not, gte, inArray, isNotNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { auditLog } from "../api/auditLogger";

function currentPeriod(): string {
  const now = new Date();
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

async function generateInvoiceForClinic(
  clinic: typeof clinics.$inferSelect,
  period: string
): Promise<void> {
  const existing = await db.query.invoices.findFirst({
    where: and(eq(invoices.clinicId, clinic.id), eq(invoices.period, period)),
  });
  if (existing) return;

  const [year, month] = period.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(patients)
    .where(and(eq(patients.clinicId, clinic.id), gte(patients.createdAt, startDate), lt(patients.createdAt, endDate)));

  const unitPrice = clinic.billingUnitPrice ?? parseFloat(process.env.DEFAULT_UNIT_PRICE ?? "50");
  const total = cnt * unitPrice;
  const graceDays = parseInt(process.env.BILLING_GRACE_DAYS ?? "7");
  const issuedAt = new Date();
  const dueAt = new Date(issuedAt.getTime() + graceDays * 24 * 60 * 60 * 1000);

  await db.insert(invoices).values({
    clinicId: clinic.id,
    period,
    patientCount: cnt,
    unitPrice,
    total,
    currency: clinic.currency,
    status: "ISSUED",
    issuedAt,
    dueAt,
  });

  auditLog({
    clinicId: clinic.id,
    actorId: "system",
    actorRole: "SYSTEM",
    action: "invoice.generated",
    metadata: { period, patientCount: cnt, total, unitPrice },
  });
}

export async function checkAndSuspendOverdue(): Promise<void> {
  const now = new Date();

  const overdueInvoices = await db.query.invoices.findMany({
    where: and(not(eq(invoices.status, "PAID")), isNotNull(invoices.dueAt), lt(invoices.dueAt as any, now)),
  });

  if (overdueInvoices.length === 0) return;

  const clinicIdsToSuspend = [...new Set(overdueInvoices.map((i) => i.clinicId))];

  for (const clinicId of clinicIdsToSuspend) {
    const clinic = await db.query.clinics.findFirst({ where: eq(clinics.id, clinicId) });
    if (!clinic || clinic.status === "SUSPENDED") continue;

    await db.update(clinics).set({ status: "SUSPENDED" }).where(eq(clinics.id, clinicId));

    auditLog({
      clinicId,
      actorId: "system",
      actorRole: "SYSTEM",
      action: "clinic.suspended_due_to_unpaid_invoice",
      metadata: {
        invoiceIds: overdueInvoices.filter((i) => i.clinicId === clinicId).map((i) => i.id),
      },
    });
  }
}

export async function reactivateClinicAfterPayment(clinicId: string): Promise<void> {
  const now = new Date();
  const remainingOverdue = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.clinicId, clinicId),
      not(eq(invoices.status, "PAID")),
      isNotNull(invoices.dueAt),
      lt(invoices.dueAt as any, now)
    ),
  });

  if (!remainingOverdue) {
    const clinic = await db.query.clinics.findFirst({ where: eq(clinics.id, clinicId) });
    if (clinic?.status === "SUSPENDED") {
      await db.update(clinics).set({ status: "ACTIVE" }).where(eq(clinics.id, clinicId));
      auditLog({
        clinicId,
        actorId: "system",
        actorRole: "SYSTEM",
        action: "clinic.reactivated_after_payment",
      });
    }
  }
}

export async function runBillingCycle(targetClinicIds?: string[]): Promise<void> {
  try {
    const today = new Date();
    const todayDay = today.getDate();
    const period = currentPeriod();

    const conditions: any[] = [eq(clinics.status, "ACTIVE")];
    if (targetClinicIds && targetClinicIds.length > 0) {
      conditions.push(inArray(clinics.id, targetClinicIds));
    }

    const activeClinics = await db.query.clinics.findMany({
      where: and(...conditions),
    });

    for (const clinic of activeClinics) {
      if (todayDay >= clinic.billingAnchorDay) {
        await generateInvoiceForClinic(clinic, period);
      }
    }

    await checkAndSuspendOverdue();
  } catch (err) {
    console.error("[billing] runBillingCycle error:", err);
  }
}
