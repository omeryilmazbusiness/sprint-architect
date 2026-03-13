import { useQuery } from "@tanstack/react-query";
import type { AdminDashboardData } from "@/lib/api/adminDashboard";

export function useAdminDashboard() {
  return useQuery<AdminDashboardData>({
    queryKey: ["/v1/admin/dashboard"],
  });
}
