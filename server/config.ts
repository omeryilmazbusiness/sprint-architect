import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

/**
 * Well-known insecure default values used during local development.
 * The server refuses to start in production if either JWT secret matches one
 * of these strings.
 */
const DEV_JWT_DEFAULTS = [
  "ht-access-secret-dev-only",
  "ht-refresh-secret-dev-only",
] as const;

const DEV_SESSION_DEFAULTS = [
  "change-me-to-a-long-random-string",
  "change-me-to-a-long-random-string-in-production",
] as const;

const MIN_SESSION_SECRET_LENGTH = 32;

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_URL_TEST: z.string().optional(),
  SESSION_SECRET: z.string().min(1, "SESSION_SECRET is required"),
  PORT: z.coerce.number().default(5000),

  /**
   * JWT signing secrets — MUST be overridden in production.
   * Defaults are provided so local/test environments start without extra
   * configuration, but the server will exit(1) if these defaults are still
   * set when NODE_ENV=production.
   */
  JWT_ACCESS_SECRET: z
    .string()
    .min(1, "JWT_ACCESS_SECRET is required")
    .default("ht-access-secret-dev-only"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(1, "JWT_REFRESH_SECRET is required")
    .default("ht-refresh-secret-dev-only"),

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

// ── Production guard: refuse to start with known-weak JWT secrets ─────────────
// If a developer forgets to set JWT_ACCESS_SECRET / JWT_REFRESH_SECRET before
// deploying, the server will exit immediately instead of silently accepting
// forgeable tokens.
if (_env.NODE_ENV === "production") {
  const usingJwtDefault =
    (DEV_JWT_DEFAULTS as readonly string[]).includes(_env.JWT_ACCESS_SECRET) ||
    (DEV_JWT_DEFAULTS as readonly string[]).includes(_env.JWT_REFRESH_SECRET);
  if (usingJwtDefault) {
    console.error(
      "[config] FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set " +
        "to strong, unique secrets in production. " +
        "The default development values were detected — server cannot start.",
    );
    process.exit(1);
  }

  const weakSession =
    _env.SESSION_SECRET.length < MIN_SESSION_SECRET_LENGTH ||
    (DEV_SESSION_DEFAULTS as readonly string[]).includes(_env.SESSION_SECRET);
  if (weakSession) {
    console.error(
      `[config] FATAL: SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} ` +
        "characters and must not use a development placeholder in production.",
    );
    process.exit(1);
  }

  if (process.env.STORAGE_PROVIDER !== "s3") {
    console.error(
      "[config] FATAL: STORAGE_PROVIDER must be 's3' in production. " +
        "Local disk storage is not supported for production deployments.",
    );
    process.exit(1);
  }

  const smtpConfigured = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
  );
  if (!smtpConfigured) {
    console.error(
      "[config] FATAL: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM " +
        "must all be set in production.",
    );
    process.exit(1);
  }
}

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
  /** JWT signing secret for access tokens (15 min TTL). */
  jwtAccessSecret: _env.JWT_ACCESS_SECRET,
  /** JWT signing secret for refresh tokens (30 day TTL). */
  jwtRefreshSecret: _env.JWT_REFRESH_SECRET,
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
