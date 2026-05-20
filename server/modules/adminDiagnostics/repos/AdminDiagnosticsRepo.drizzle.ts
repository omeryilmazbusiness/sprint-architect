import { pingDatabase } from "../../../shared/infra/dbPing";

export async function pingDb(): Promise<{ ok: boolean; latencyMs: number }> {
  return pingDatabase();
}
