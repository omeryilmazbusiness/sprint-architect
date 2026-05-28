import { env } from "../../../config";
import { pingDatabase } from "../../../shared/infra/dbPing";
import type { HealthCheckDto } from "../schemas/health.schemas";

const APP_VERSION = process.env.APP_VERSION ?? "1.0.0";
const SERVICE_NAME = "Healory API";

function resolveStorageCheck(): HealthCheckDto["checks"]["storage"] {
  const provider = process.env.STORAGE_PROVIDER ?? "local";
  if (provider === "s3") {
    const configured = !!(
      process.env.S3_BUCKET &&
      process.env.S3_REGION &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY
    );
    return { provider: "s3", configured };
  }
  return { provider: "local", configured: true };
}

export async function runHealthCheck(): Promise<HealthCheckDto> {
  const db = await pingDatabase();
  const storage = resolveStorageCheck();

  let status: HealthCheckDto["status"] = "ok";
  if (!db.ok) {
    status = "down";
  } else if (env.isProd && storage.provider === "s3" && !storage.configured) {
    status = "degraded";
  }

  return {
    status,
    time: new Date().toISOString(),
    version: APP_VERSION,
    service: SERVICE_NAME,
    environment: env.nodeEnv,
    checks: {
      database: db,
      storage,
    },
  };
}
