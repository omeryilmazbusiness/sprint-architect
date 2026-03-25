import { useGuestDashboard, PatientDocument } from "./useGuestDashboard";

export type { PatientDocument };

export function useGuestDocuments() {
  const { isLoading, isError, refetch, documents } = useGuestDashboard();

  const pending = documents.filter((d) => d.status === "ASSIGNED");
  const uploaded = documents.filter((d) =>
    ["UPLOADED", "APPROVED"].includes(d.status)
  );
  const rejected = documents.filter((d) => d.status === "REJECTED");

  return {
    isLoading,
    isError,
    refetch,
    documents,
    pending,
    uploaded,
    rejected,
    totalCount: documents.length,
    pendingCount: pending.length,
  };
}
