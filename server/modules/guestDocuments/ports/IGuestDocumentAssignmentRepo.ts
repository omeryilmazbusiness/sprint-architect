export interface AssignDocumentItemInput {
  documentTypeId: string;
  instructionText?: string | null;
}

export interface AssignedPatientDocumentRow {
  id: string;
  patientId: string;
  clinicId: string;
  documentTypeId: string;
  status: string;
  instructionText: string | null;
  isNewAssignment: boolean;
}

export interface IGuestDocumentAssignmentRepo {
  findDocumentType(clinicId: string, documentTypeId: string): Promise<{ id: string; name: string } | null>;
  assignToGuest(
    clinicId: string,
    patientId: string,
    items: AssignDocumentItemInput[]
  ): Promise<AssignedPatientDocumentRow[]>;
}
