import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface PatientDocument {
  id: string;
  status: "ASSIGNED" | "UPLOADED" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  instructionText?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  uploadedAt?: string | null;
  documentType: { name: string };
}

export interface PatientAppointment {
  id: string;
  title: string;
  type: string | null;
  status: "SCHEDULED" | "DONE" | "CANCELLED";
  startAt: string;
  doctor?: { fullName?: string; name?: string } | null;
}

export interface PatientDashboardData {
  patient: {
    id: string;
    fullName: string;
    patientKey: string;
    status: string;
    clinicId?: string;
  };
  appointments: PatientAppointment[];
  documents: PatientDocument[];
  doctors: Array<{ id: string; name: string; specialty: string }>;
  plan: {
    doctor?: { name: string; specialty: string } | null;
    hotel?: { name: string; address: string } | null;
  };
}

const QUERY_KEY = ["/v1/patient/dashboard"] as const;

export function useGuestDashboard() {
  const queryClient = useQueryClient();
  const query = useQuery<PatientDashboardData>({
    queryKey: QUERY_KEY,
    retry: 2,
    staleTime: 30_000,
  });

  function refetch() {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }

  const data = query.data;
  return {
    isLoading: query.isLoading,
    isError: query.isError,
    refetch,
    patient: data?.patient ?? null,
    appointments: data?.appointments ?? [],
    documents: data?.documents ?? [],
    doctors: data?.doctors ?? [],
    plan: data?.plan ?? { doctor: null, hotel: null },
  };
}
