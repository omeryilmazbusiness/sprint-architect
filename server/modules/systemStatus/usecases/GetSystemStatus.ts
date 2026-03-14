import { getSystemStatus, type SystemStatusResult } from "../repos/SystemStatusRepo.drizzle";

export async function executeGetSystemStatus(): Promise<SystemStatusResult> {
  return getSystemStatus();
}
