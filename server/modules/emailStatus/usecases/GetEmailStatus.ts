import { getEmailStatusSummary, type EmailStatusSummary } from "../repos/EmailStatusRepo.drizzle";

export async function executeGetEmailStatus(): Promise<EmailStatusSummary> {
  return getEmailStatusSummary();
}
