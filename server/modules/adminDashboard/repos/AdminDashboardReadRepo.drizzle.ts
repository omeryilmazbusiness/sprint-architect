import { db } from "../../../db";
import { clinics, users, invoices, auditLogs } from "@shared/schema";
import { eq, count, sql, desc } from "drizzle-orm";
import { RecentInvoiceDto, ActivityEntryDto } from "../dtos/AdminDashboardDto";

function deriveActivityMessage(
  action: string,
  metadata: Record<string, unknown> | null,
): string {
  const meta = metadata ?? {};
  const clinicName =
    (meta.clinicName as string) ?? (meta.name as string) ?? "";
  const email = (meta.email as string) ?? "";
  const period = (meta.period as string) ?? "";

  switch (action) {
    case "CLINIC_CREATED":
      return `New clinic created${clinicName ? `: ${clinicName}` : ""}`;
    case "CLINIC_SUSPENDED":
      return `Clinic suspended${clinicName ? `: ${clinicName}` : ""}`;
    case "CLINIC_REACTIVATED":
      return `Clinic reactivated${clinicName ? `: ${clinicName}` : ""}`;
    case "CLINIC_UPDATED":
      return `Clinic updated${clinicName ? `: ${clinicName}` : ""}`;
    case "CLINIC_DELETED":
      return `Clinic removed${clinicName ? `: ${clinicName}` : ""}`;
    case "INVOICE_GENERATED":
      return `Invoices generated${period ? ` for ${period}` : ""}`;
    case "INVOICE_MARKED_PAID":
    case "INVOICE_STATUS_UPDATED":
      return `Invoice marked as paid`;
    case "USER_CREATED":
      return `New user added${email ? `: ${email}` : ""}`;
    case "ADMIN_PASSWORD_CHANGED":
      return `Admin password updated`;
    case "ADMIN_LOGIN":
    case "ADMIN_LOGOUT_ALL":
      return `Admin session activity`;
    default:
      return action
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export interface DashboardCounts {
  totalClinics: number;
  activeClinics: number;
  suspendedClinics: number;
  pendingInvoices: number;
  unpaidInvoices: number;
  paidInvoices: number;
}

export const adminDashboardReadRepo = {
  async getCounts(): Promise<DashboardCounts> {
    const [
      [{ total: totalClinics }],
      [{ total: activeClinics }],
      [{ total: suspendedClinics }],
      [{ total: pendingInvoices }],
      [{ total: unpaidInvoices }],
      [{ total: paidInvoices }],
    ] = await Promise.all([
      db
        .select({ total: count() })
        .from(clinics)
        .where(sql`${clinics.deletedAt} IS NULL`),
      db
        .select({ total: count() })
        .from(clinics)
        .where(
          sql`${clinics.status} = 'ACTIVE' AND ${clinics.deletedAt} IS NULL`,
        ),
      db
        .select({ total: count() })
        .from(clinics)
        .where(
          sql`${clinics.status} = 'SUSPENDED' AND ${clinics.deletedAt} IS NULL`,
        ),
      db
        .select({ total: count() })
        .from(invoices)
        .where(eq(invoices.status, "PENDING")),
      db
        .select({ total: count() })
        .from(invoices)
        .where(eq(invoices.status, "UNPAID")),
      db
        .select({ total: count() })
        .from(invoices)
        .where(eq(invoices.status, "PAID")),
    ]);

    return {
      totalClinics,
      activeClinics,
      suspendedClinics,
      pendingInvoices,
      unpaidInvoices,
      paidInvoices,
    };
  },

  async getTotalBilledThisMonth(period: string): Promise<number> {
    const [{ total }] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${invoices.total}), 0)::int`,
      })
      .from(invoices)
      .where(eq(invoices.period, period));
    return Number(total ?? 0);
  },

  async getRecentInvoices(): Promise<RecentInvoiceDto[]> {
    const rows = await db.query.invoices.findMany({
      orderBy: (inv, { desc }) => [desc(inv.createdAt)],
      limit: 5,
      with: { clinic: true },
    });

    return rows.map((row) => ({
      id: row.id,
      clinicId: row.clinicId,
      clinicName: row.clinic?.name ?? "—",
      period: row.period,
      total: row.total,
      currency: row.currency,
      status: row.status,
      createdAt: row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
    }));
  },

  async getActivity(): Promise<ActivityEntryDto[]> {
    const rows = await db.query.auditLogs.findMany({
      orderBy: desc(auditLogs.createdAt),
      limit: 5,
    });

    return rows.map((row) => ({
      id: row.id,
      type: row.action,
      message: deriveActivityMessage(
        row.action,
        row.metadata as Record<string, unknown> | null,
      ),
      createdAt: row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
    }));
  },
};
