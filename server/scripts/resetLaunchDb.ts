/**
 * PRODUCTION / DEVELOPMENT LAUNCH DATABASE RESET
 * ===============================================
 * Wipes ALL application data from the database to produce a clean
 * "first production release" state. Schema (tables/indexes/enums) is
 * preserved — only rows are removed via TRUNCATE CASCADE.
 *
 * ⚠️  THIS IS IRREVERSIBLE. There is no undo. ⚠️
 *
 * WILL REFUSE TO RUN unless ALL guards pass:
 *   1. NODE_ENV must NOT be "test"
 *   2. Database name must NOT contain "test"
 *   3. RESET_CONFIRM env var must equal "YES_DELETE_ALL"
 *      (omit it or set it to anything else → DRY-RUN only, exits 0)
 *
 * Usage:
 *
 *   # DRY-RUN (safe, no changes):
 *   RESET_CONFIRM="" npm run db:reset:launch
 *
 *   # Real reset (wipes everything):
 *   RESET_CONFIRM="YES_DELETE_ALL" npm run db:reset:launch
 *
 *   # Real reset + bootstrap SUPER_ADMIN:
 *   RESET_CONFIRM="YES_DELETE_ALL" \
 *     BOOTSTRAP_ADMIN_EMAIL="ops@yourcompany.com" \
 *     BOOTSTRAP_ADMIN_PASSWORD="SecurePass123!" \
 *     npm run db:reset:launch
 */

import { env, dbUrl } from "../config";
import { pool } from "../db";
import { hashPassword } from "../auth/password";
import { execSync } from "child_process";
import path from "path";

// ─── Ordered list of tables to truncate (CASCADE handles FK constraints) ─────
const TABLES_TO_TRUNCATE = [
  "email_events",
  "job_runs",
  "notifications",
  "credential_requests",
  "audit_logs",
  "invoices",
  "devices",
  "refresh_tokens",
  "patient_documents",
  "document_types",
  "appointments",
  "patient_plans",
  "transports",
  "hotels",
  "doctors",
  "patients",
  "users",
  "clinics",
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function abort(reason: string): never {
  console.error(`\n[resetLaunchDb] ✖ REFUSED: ${reason}\n`);
  process.exit(1);
}

function safeDbName(url: string): string {
  try {
    return new URL(url).pathname.slice(1);
  } catch {
    return "(unparseable)";
  }
}

function safeSummary(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "5432"}/${u.pathname.slice(1)}`;
  } catch {
    return "(unparseable)";
  }
}

function generateBootstrapId(): string {
  return "bs-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  // ── Guard 1: not test environment ──────────────────────────────────────────
  if (env.isTest) {
    abort(
      `NODE_ENV is "test". This script is for dev/prod launch resets only.\n` +
      `  To reset the test database, use: npm run test:db:reset`,
    );
  }

  // ── Guard 2: database name must not contain "test" ─────────────────────────
  const dbName = safeDbName(dbUrl);
  if (dbName.toLowerCase().includes("test")) {
    abort(
      `Database name "${dbName}" contains "test".\n` +
      `  This script refuses to run against a test database.\n` +
      `  Double-check your DATABASE_URL environment variable.`,
    );
  }

  const dbSummary = safeSummary(dbUrl);
  const resetConfirm = process.env.RESET_CONFIRM ?? "";
  const isDryRun = resetConfirm !== "YES_DELETE_ALL";

  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim() || null;
  const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim() || null;
  const demoAdminOnly = process.env.DEMO_ADMIN_ONLY === "true";

  // ── Print header ───────────────────────────────────────────────────────────
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║         LAUNCH DATABASE RESET — HealthTour SaaS         ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`  Database : ${dbSummary}`);
  console.log(`  Mode     : ${isDryRun ? "DRY-RUN (no changes)" : "⚠️  REAL RESET — DATA WILL BE DELETED"}`);
  console.log(`  Bootstrap: ${demoAdminOnly ? "demo admin (admin@demo.com)" : bootstrapEmail ? bootstrapEmail : "(none)"}`);
  console.log("");

  // ── DRY-RUN: count rows and print summary ──────────────────────────────────
  const client = await pool.connect();

  try {
    console.log("  Row counts (current):");
    console.log("  ─────────────────────────────────────────");

    let totalRows = 0;

    for (const table of TABLES_TO_TRUNCATE) {
      const { rows } = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM "${table}"`,
      );
      const count = parseInt(rows[0].count, 10);
      totalRows += count;
      const flag = count > 0 ? " ←" : "";
      console.log(`  ${table.padEnd(25)} ${String(count).padStart(6)} rows${flag}`);
    }

    console.log("  ─────────────────────────────────────────");
    console.log(`  ${"TOTAL".padEnd(25)} ${String(totalRows).padStart(6)} rows`);
    console.log("");

    if (isDryRun) {
      console.log("  DRY-RUN complete. No data was changed.");
      console.log("");
      console.log("  To execute the real reset, run:");
      console.log(`    RESET_CONFIRM="YES_DELETE_ALL" npm run db:reset:launch`);
      console.log("");
      if (bootstrapEmail) {
        console.log("  Bootstrap admin will be created (BOOTSTRAP_ADMIN_EMAIL is set).");
      } else {
        console.log("  No bootstrap admin will be created (BOOTSTRAP_ADMIN_EMAIL not set).");
      }
      console.log("");
      process.exit(0);
    }

    // ── REAL RESET ────────────────────────────────────────────────────────────
    console.log("  ⚠️  Executing reset in a transaction...");
    console.log("");

    await client.query("BEGIN");

    try {
      const tableList = TABLES_TO_TRUNCATE.map((t) => `"${t}"`).join(", ");
      await client.query(`TRUNCATE TABLE ${tableList} CASCADE`);
      console.log(`  ✓ Truncated ${TABLES_TO_TRUNCATE.length} tables.`);

      // ── Optional bootstrap admin ────────────────────────────────────────────
      if (bootstrapEmail && bootstrapPassword) {
        if (bootstrapPassword.length < 12) {
          await client.query("ROLLBACK");
          abort("BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.");
        }

        const passwordHash = await hashPassword(bootstrapPassword);
        const adminId = generateBootstrapId();

        await client.query(
          `INSERT INTO users (id, email, "passwordHash", role, status, "mustChangePassword", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, 'SUPER_ADMIN', 'ACTIVE', true, NOW(), NOW())`,
          [adminId, bootstrapEmail, passwordHash],
        );

        console.log(`  ✓ Bootstrap SUPER_ADMIN created: ${bootstrapEmail}`);
        console.log(`    (mustChangePassword=true — change password on first login)`);
      } else if (bootstrapEmail || bootstrapPassword) {
        console.warn(
          "  ⚠ Both BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD must be set to create a bootstrap admin. Skipping.",
        );
      } else {
        console.log("  ℹ No bootstrap admin created (BOOTSTRAP_ADMIN_EMAIL not provided).");
      }

      await client.query("COMMIT");
      console.log("");
      console.log("  ✓ Transaction committed.");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("  ✖ Transaction rolled back due to error.");
      throw err;
    }

    // ── Optional: seed demo admin after wipe ─────────────────────────────────
    if (demoAdminOnly) {
      console.log("");
      console.log("  Running demo admin seed (DEMO_ADMIN_ONLY=true)...");
      const seedScript = path.resolve(__dirname, "seedDemoAdminOnly.ts");
      execSync(`npx tsx "${seedScript}"`, {
        stdio: "inherit",
        env: { ...process.env, NODE_ENV: env.nodeEnv },
      });
    }

    // ── Post-reset row count verification ──────────────────────────────────────
    console.log("");
    console.log("  Post-reset row counts:");
    console.log("  ─────────────────────────────────────────");

    for (const table of TABLES_TO_TRUNCATE) {
      const { rows } = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM "${table}"`,
      );
      const count = parseInt(rows[0].count, 10);
      const flag = count > 0 ? " ←" : "";
      console.log(`  ${table.padEnd(25)} ${String(count).padStart(6)} rows${flag}`);
    }

    console.log("");
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║                    RESET COMPLETE                        ║");
    console.log("╚══════════════════════════════════════════════════════════╝");
    console.log("");
    console.log("  The database is now in a clean launch state.");
    console.log("  ● No clinics, no managers, no patients, no invoices.");

    if (bootstrapEmail && bootstrapPassword) {
      console.log(`  ● One SUPER_ADMIN account exists: ${bootstrapEmail}`);
      console.log("  ● mustChangePassword=true — operator must change password on first login.");
    } else {
      console.log("  ● No users exist. Use the mobile app or API to create the first SUPER_ADMIN.");
    }

    console.log("");
  } finally {
    client.release();
    await pool.end();
  }

  process.exit(0);
})();
