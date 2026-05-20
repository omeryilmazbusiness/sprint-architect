import { z } from "zod";

export const healthCheckSchema = z.object({
  status: z.enum(["ok", "degraded", "down"]),
  time: z.string(),
  version: z.string(),
  service: z.string(),
  environment: z.string(),
  checks: z.object({
    database: z.object({
      ok: z.boolean(),
      latencyMs: z.number(),
    }),
    storage: z.object({
      provider: z.string(),
      configured: z.boolean(),
    }),
  }),
});

export type HealthCheckDto = z.infer<typeof healthCheckSchema>;
