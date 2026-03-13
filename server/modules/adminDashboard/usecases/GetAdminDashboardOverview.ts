import { adminDashboardReadRepo } from "../repos/AdminDashboardReadRepo.drizzle";
import { AdminDashboardDto } from "../dtos/AdminDashboardDto";

function getCurrentPeriodIstanbul(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  return `${y}-${m}`;
}

export async function getAdminDashboardOverview(): Promise<AdminDashboardDto> {
  const currentPeriod = getCurrentPeriodIstanbul();

  const [counts, totalBilledThisMonth, recentInvoices, activity] =
    await Promise.all([
      adminDashboardReadRepo.getCounts(),
      adminDashboardReadRepo.getTotalBilledThisMonth(currentPeriod),
      adminDashboardReadRepo.getRecentInvoices(),
      adminDashboardReadRepo.getActivity(),
    ]);

  return {
    currentPeriod,
    clinics: {
      total: counts.totalClinics,
      active: counts.activeClinics,
      suspended: counts.suspendedClinics,
    },
    invoices: {
      pending: counts.pendingInvoices,
      unpaid: counts.unpaidInvoices,
      paid: counts.paidInvoices,
      totalBilledThisMonth,
    },
    recentInvoices,
    activity,
  };
}
