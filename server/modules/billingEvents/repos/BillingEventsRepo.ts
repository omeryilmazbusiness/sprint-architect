export interface BillingEventRecord {
  id: string;
  clinicId: string;
  patientId: string;
  period: string;
  createdAt: Date;
}

export interface IBillingEventsRepo {
  upsert(input: { clinicId: string; patientId: string; period: string }): Promise<BillingEventRecord>;
  countForPeriod(clinicId: string, period: string): Promise<number>;
}
