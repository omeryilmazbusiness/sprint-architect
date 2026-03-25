import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_URL_TEST: z.string().optional(),
  SESSION_SECRET: z.string().min(1, "SESSION_SECRET is required"),
  PORT: z.coerce.number().default(5000),
  /**
   * GUEST_MULTI_DEVICE_DEMO — Dev / demo only.
   * When "true", guest login skips the single-device binding check so the
   * same patientKey can be used from any number of devices simultaneously.
   * Automatically forced to false in NODE_ENV=production regardless of value.
   */
  GUEST_MULTI_DEVICE_DEMO: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "[config] Invalid environment variables:",
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  process.exit(1);
}

const _env = parsed.data;

function deriveTestUrl(prodUrl: string): string {
  try {
    const u = new URL(prodUrl);
    const dbName = u.pathname.slice(1);
    u.pathname = `/${dbName}_test`;
    return u.toString();
  } catch {
    throw new Error("[config] Cannot derive DATABASE_URL_TEST from DATABASE_URL — set it explicitly");
  }
}

function resolveDbUrl(): string {
  if (_env.NODE_ENV === "test") {
    if (_env.DATABASE_URL_TEST) return _env.DATABASE_URL_TEST;
    return deriveTestUrl(_env.DATABASE_URL);
  }
  return _env.DATABASE_URL;
}

export const dbUrl = resolveDbUrl();

export const env = {
  nodeEnv: _env.NODE_ENV,
  isTest: _env.NODE_ENV === "test",
  isProd: _env.NODE_ENV === "production",
  isDev: _env.NODE_ENV === "development",
  port: _env.PORT,
  sessionSecret: _env.SESSION_SECRET,
  /** True only in non-production when GUEST_MULTI_DEVICE_DEMO=true is set. */
  guestMultiDeviceDemo: _env.NODE_ENV !== "production" && (_env.GUEST_MULTI_DEVICE_DEMO ?? false),
} as const;

function safeDbInfo(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "(unparseable)";
  }
}

console.log(
  `[config] NODE_ENV=${env.nodeEnv}  DB=${safeDbInfo(dbUrl)}`,
);
