export interface PatientListItem {
  id: string;
  fullName: string;
  patientKey: string;
  status: string;
  arrivalDate: string | null;
  departureDate: string | null;
  phoneE164: string | null;
  email: string | null;
  hasPendingDocs: boolean;
  hasTodayAppointment: boolean;
}

export interface PatientListResult {
  items: PatientListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface ListPatientsFilter {
  clinicId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  status?: string;
  pendingDocs?: boolean;
  todayAppt?: boolean;
}

export interface ApprovePatientInput {
  patientId: string;
  clinicId: string;
  actorId: string;
  actorRole: string;
}

export interface ApprovePatientResult {
  alreadyApproved: boolean;
  approvedAt: Date;
  billingPeriod: string;
}

export interface IManagerPatientsRepo {
  listPatients(filter: ListPatientsFilter): Promise<PatientListResult>;
  approvePatient(input: ApprovePatientInput): Promise<ApprovePatientResult>;
}
