export interface RecentInvoiceDto {
  id: string;
  clinicId: string;
  clinicName: string;
  period: string;
  total: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface ActivityEntryDto {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface AdminDashboardDto {
  currentPeriod: string;
  clinics: {
    total: number;
    active: number;
    suspended: number;
  };
  invoices: {
    pending: number;
    unpaid: number;
    paid: number;
    totalBilledThisMonth: number;
  };
  recentInvoices: RecentInvoiceDto[];
  activity: ActivityEntryDto[];
}
