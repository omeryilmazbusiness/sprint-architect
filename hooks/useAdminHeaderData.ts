import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { fetchDiagnostics, DiagnosticsResult } from "@/lib/api/adminDiagnostics";

export interface AdminHeaderData {
  unreadCount: number;
  healthOk: boolean;
  healthLoaded: boolean;
  envLabel: "DEV" | "PROD";
  cityLabel: string;
  email: string;
  role: string;
  initials: string;
}

export function useAdminHeaderData(): AdminHeaderData {
  const { user } = useAuth();

  const { data: notifData } = useQuery<{ count: number }>({
    queryKey: ["/v1/admin/notifications/unread-count"],
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  const { data: diagData } = useQuery<DiagnosticsResult>({
    queryKey: ["/v1/admin/diagnostics"],
    queryFn: fetchDiagnostics,
    staleTime: 60_000,
    retry: false,
  });

  const healthOk = diagData ? diagData.api.ok && diagData.db.ok : true;
  const isProd = diagData?.env.nodeEnv === "production";
  const rawTz = diagData?.env.timezone ?? "Europe/Istanbul";
  const cityLabel = rawTz.includes("/") ? (rawTz.split("/").pop() ?? rawTz) : rawTz;

  const email = user?.email ?? "";
  const initials = email.length >= 2 ? email.slice(0, 2).toUpperCase() : "AD";

  return {
    unreadCount: notifData?.count ?? 0,
    healthOk,
    healthLoaded: !!diagData,
    envLabel: isProd ? "PROD" : "DEV",
    cityLabel,
    email,
    role: user?.role ?? "",
    initials,
  };
}
