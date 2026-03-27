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
  documentType: { id?: string; name: string; isRequired?: boolean } | null;
}

export interface PatientAppointment {
  id: string;
  title: string;
  type: string | null;
  status: "SCHEDULED" | "DONE" | "CANCELLED";
  startAt: string;
  endAt?: string | null;
  locationText?: string | null;
  notes?: string | null;
  doctor?: { id: string; fullName?: string; specialty?: string } | null;
}

export interface PatientTransport {
  id: string;
  driverName: string | null;
  driverPhone: string | null;
  vehicleInfo: string | null;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  vehiclePlate: string | null;
  meetingPointText: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface PatientHotel {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  stayDays: number | null;
  roomNo: string | null;
  checkInDate: string | null;
  checkOutDate: string | null;
}

export interface PatientManager {
  fullName: string | null;
  phone: string | null;
  email: string | null;
}

export interface PatientInfo {
  id: string;
  fullName: string;
  patientKey: string;
  status: string;
  phone?: string | null;
  email?: string | null;
  nationality?: string | null;
  arrivalDate?: string | null;
  departureDate?: string | null;
  clinicId?: string;
  clinicName?: string | null;
  clinicAddress?: string | null;
  clinicSupportPhone?: string | null;
  clinicSupportEmail?: string | null;
  clinicWebsite?: string | null;
  manager?: PatientManager | null;
}

export interface PatientDashboardData {
  patient: PatientInfo;
  transport: PatientTransport | null;
  hotel: PatientHotel | null;
  appointments: PatientAppointment[];
  doctors: Array<{
    id: string;
    fullName: string;
    specialty?: string | null;
    phone?: string | null;
    email?: string | null;
    photoUrl?: string | null;
    university?: string | null;
    experienceYears?: number | null;
    languages?: string | null;
    diplomaUrl?: string | null;
    bio?: string | null;
  }>;
  documents: PatientDocument[];
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
    isRefetching: query.isRefetching,
    isError: query.isError,
    refetch,
    patient: data?.patient ?? null,
    transport: data?.transport ?? null,
    hotel: data?.hotel ?? null,
    appointments: data?.appointments ?? [],
    doctors: data?.doctors ?? [],
    documents: data?.documents ?? [],
  };
}
