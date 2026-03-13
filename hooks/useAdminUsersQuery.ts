import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listUnifiedEntities, type UnifiedListResponse } from "@/lib/api/adminUsers";

interface Filters {
  search?: string;
  entityType?: "ADMIN" | "MANAGER" | "PATIENT";
  status?: string;
  clinicId?: string;
}

export function useAdminUsersQuery(filters: Filters) {
  return useQuery<UnifiedListResponse>({
    queryKey: [
      "/v1/admin/users",
      filters.search ?? "",
      filters.entityType ?? "ALL",
      filters.status ?? "ALL",
      filters.clinicId ?? "",
    ],
    queryFn: () =>
      listUnifiedEntities({
        search: filters.search || undefined,
        entityType: filters.entityType,
        status: filters.status || undefined,
        clinicId: filters.clinicId || undefined,
      }),
  });
}

export function useInvalidateAdminUsers() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["/v1/admin/users"] });
}
