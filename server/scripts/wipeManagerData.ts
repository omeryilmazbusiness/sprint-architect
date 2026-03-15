/**
 * MANAGER DATA WIPE SCRIPT
 * ========================
 * Safely wipes all manager-scoped (clinic-scoped) data from the database.
 * Schema (tables / indexes / enums) is preserved — only rows are removed.
 *
 * ⚠️  THIS IS IRREVERSIBLE.  There is no undo. ⚠️
 *
 * SAFETY GUARDS (all must pass for a real run):
 *   1. NODE_ENV must NOT be "test"
 *   2. Database name must NOT contain "test"
 *   3. WIPE_MANAGER_CONFIRM must equal "YES_WIPE_MANAGER_DATA"
 *      (omit it or set anything else → DRY-RUN only, exits 0)
 *
 * SCOPE:
 *   MODE 1 — Specific clinic : WIPE_CLINIC_ID="<id>" npm run db:wipe:manager
 *   MODE 2 — All clinic data : npm run db:wipe:manager   (no WIPE_CLINIC_ID)
 *
 * Dry-run commands (no changes):
 *   npm run db:wipe:manager:dry
 *   WIPE_CLINIC_ID="<id>" npm run db:wipe:manager:dry
 *
 * Real-wipe commands:
 *   npm run db:wipe:manager
 *   WIPE_CLINIC_ID="<id>" npm run db:wipe:manager
 *
 * Tables wiped (FK-safe order):
 *   patient_documents → appointments → patient_plans → credential_requests
 *   → notifications → audit_logs → invoices
 *   → refresh_tokens (patient-linked only) → devices (patient-linked only)
 *   → patients → document_types → doctors → hotels → transports
 */

import { env, dbUrl } from "../config";
import { pool } from "../db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function abort(reason: string): never {
  console.error(`\n[wipeManagerData] ✖ REFUSED: ${reason}\n`);
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

// ─── Table specifications ─────────────────────────────────────────────────────
//
// Each entry describes how to scope deletes for that table:
//   clinicIdCol — column to filter by clinic (used when WIPE_CLINIC_ID is set
//                 OR for the full-wipe "delete all" pass)
//   patientSubquery — used instead of clinicIdCol when the table has no
//                     clinic_id but links to patients (clinic-scoped via patients)
//   fullWipeWhere — override WHERE for full-wipe (no clinicId).
//                   undefined = delete all rows in that table.

interface TableSpec {
  table: string;
  clinicIdCol?: string;
  patientSubquery?: string;
  fullWipeWhere?: string;
}

// Order is FK-safe: children before parents.
const TABLES: TableSpec[] = [
  { table: "patient_documents",   clinicIdCol: "clinic_id" },
  { table: "appointments",        clinicIdCol: "clinic_id" },
  { table: "patient_plans",       clinicIdCol: "clinic_id" },
  { table: "credential_requests", clinicIdCol: "clinic_id" },
  { table: "notifications",       clinicIdCol: "clinic_id" },
  { table: "audit_logs",          clinicIdCol: "clinic_id" },
  { table: "invoices",            clinicIdCol: "clinic_id" },
  // Linked to patients but lack their own clinic_id column
  {
    table: "refresh_tokens",
    patientSubquery: "patient_id IN (SELECT id FROM patients WHERE clinic_id = $1)",
    fullWipeWhere:   "patient_id IS NOT NULL",
  },
  {
    table: "devices",
    patientSubquery: "patient_id IN (SELECT id FROM patients WHERE clinic_id = $1)",
    fullWipeWhere:   "patient_id IS NOT NULL",
  },
  // Core entities (parents last)
  { table: "patients",       clinicIdCol: "clinic_id" },
  { table: "document_types", clinicIdCol: "clinic_id" },
  { table: "doctors",        clinicIdCol: "clinic_id" },
  { table: "hotels",         clinicIdCol: "clinic_id" },
  { table: "transports",     clinicIdCol: "clinic_id" },
];

type QueryClient = Awaited<ReturnType<typeof pool.connect>>;

// ─── Count helpers ────────────────────────────────────────────────────────────

async function countRows(
  client: QueryClient,
  spec: TableSpec,
  clinicId: string | null,
): Promise<number> {
  let sql: string;
  let params: string[];

  if (clinicId) {
    if (spec.clinicIdCol) {
      sql = `SELECT COUNT(*)::text AS c FROM "${spec.table}" WHERE ${spec.clinicIdCol} = $1`;
      params = [clinicId];
    } else if (spec.patientSubquery) {
      sql = `SELECT COUNT(*)::text AS c FROM "${spec.table}" WHERE ${spec.patientSubquery}`;
      params = [clinicId];
    } else {
      sql = `SELECT COUNT(*)::text AS c FROM "${spec.table}"`;
      params = [];
    }
  } else {
    if (spec.clinicIdCol) {
      sql = `SELECT COUNT(*)::text AS c FROM "${spec.table}"`;
      params = [];
    } else if (spec.fullWipeWhere) {
      sql = `SELECT COUNT(*)::text AS c FROM "${spec.table}" WHERE ${spec.fullWipeWhere}`;
      params = [];
    } else {
      sql = `SELECT COUNT(*)::text AS c FROM "${spec.table}"`;
      params = [];
    }
  }

  const { rows } = await client.query<{ c: string }>(sql, params);
  return parseInt(rows[0].c, 10);
}

// ─── Delete helpers ───────────────────────────────────────────────────────────

async function deleteRows(
  client: QueryClient,
  spec: TableSpec,
  clinicId: string | null,
): Promise<number> {
  let sql: string;
  let params: string[];

  if (clinicId) {
    if (spec.clinicIdCol) {
      sql = `DELETE FROM "${spec.table}" WHERE ${spec.clinicIdCol} = $1`;
      params = [clinicId];
    } else if (spec.patientSubquery) {
      sql = `DELETE FROM "${spec.table}" WHERE ${spec.patientSubquery}`;
      params = [clinicId];
    } else {
      return 0;
    }
  } else {
    if (spec.clinicIdCol) {
      sql = `DELETE FROM "${spec.table}"`;
      params = [];
    } else if (spec.fullWipeWhere) {
      sql = `DELETE FROM "${spec.table}" WHERE ${spec.fullWipeWhere}`;
      params = [];
    } else {
      return 0;
    }
  }

  const result = await client.query(sql, params);
  return result.rowCount ?? 0;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  // ── Guard 1: not test environment ──────────────────────────────────────────
  if (env.isTest) {
    abort(
      `NODE_ENV is "test".\n` +
      `  This script is for development only.\n` +
      `  It will never touch the test database.`,
    );
  }

  // ── Guard 2: database name must not contain "test" ─────────────────────────
  const dbName = safeDbName(dbUrl);
  if (dbName.toLowerCase().includes("test")) {
    abort(
      `Database name "${dbName}" contains "test".\n` +
      `  This script refuses to operate against a test database.\n` +
      `  Double-check your DATABASE_URL environment variable.`,
    );
  }

  const dbSummary   = safeSummary(dbUrl);
  const confirmed   = process.env.WIPE_MANAGER_CONFIRM === "YES_WIPE_MANAGER_DATA";
  const isDryRun    = !confirmed;
  const clinicId    = process.env.WIPE_CLINIC_ID?.trim() || null;
  const scopeLabel  = clinicId ? `clinic "${clinicId}"` : "ALL clinics";

  // ── Header ─────────────────────────────────────────────────────────────────
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║        MANAGER DATA WIPE — HealthTour SaaS              ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`  Database : ${dbSummary}`);
  console.log(`  Scope    : ${scopeLabel}`);
  console.log(`  Mode     : ${isDryRun ? "DRY-RUN (no changes will be made)" : "⚠️  REAL WIPE — DATA WILL BE DELETED"}`);
  console.log("");

  const client = await pool.connect();

  try {
    // ── DRY-RUN: show what would be deleted ──────────────────────────────────
    console.log(`  Row counts${isDryRun ? " (what would be deleted)" : " before wipe"}:`);
    console.log("  ─────────────────────────────────────────────────────");

    let totalRows = 0;
    const counts: { spec: TableSpec; count: number }[] = [];

    for (const spec of TABLES) {
      const count = await countRows(client, spec, clinicId);
      counts.push({ spec, count });
      totalRows += count;
      const marker = count > 0 ? " ←" : "";
      console.log(`  ${spec.table.padEnd(28)} ${String(count).padStart(6)} rows${marker}`);
    }

    console.log("  ─────────────────────────────────────────────────────");
    console.log(`  ${"TOTAL".padEnd(28)} ${String(totalRows).padStart(6)} rows`);
    console.log("");

    if (isDryRun) {
      console.log("  DRY-RUN complete. No changes made.");
      console.log("");
      console.log("  To perform the real wipe, run:");
      if (clinicId) {
        console.log(`    WIPE_CLINIC_ID="${clinicId}" npm run db:wipe:manager`);
      } else {
        console.log("    npm run db:wipe:manager");
      }
      console.log("");
      process.exit(0);
    }

    // ── REAL WIPE ────────────────────────────────────────────────────────────
    console.log("  Starting wipe inside a transaction...");
    console.log("");

    await client.query("BEGIN");

    const deleted: { table: string; count: number }[] = [];

    for (const spec of TABLES) {
      const count = await deleteRows(client, spec, clinicId);
      deleted.push({ table: spec.table, count });
      console.log(`  ✓  ${spec.table.padEnd(28)} ${String(count).padStart(6)} rows deleted`);
    }

    await client.query("COMMIT");

    // ── Post-wipe summary ────────────────────────────────────────────────────
    const totalDeleted = deleted.reduce((s, r) => s + r.count, 0);

    console.log("");
    console.log("  ─────────────────────────────────────────────────────");
    console.log(`  ${"TOTAL DELETED".padEnd(28)} ${String(totalDeleted).padStart(6)} rows`);
    console.log("");

    // Verify counts are now 0
    console.log("  Post-wipe verification (should all be 0):");
    console.log("  ─────────────────────────────────────────────────────");

    let hasRemnants = false;
    for (const spec of TABLES) {
      const remaining = await countRows(client, spec, clinicId);
      const flag = remaining > 0 ? " ← ⚠️  NOT ZERO" : "";
      if (remaining > 0) hasRemnants = true;
      console.log(`  ${spec.table.padEnd(28)} ${String(remaining).padStart(6)} rows${flag}`);
    }

    console.log("");

    if (hasRemnants) {
      console.log("  ⚠️  WARNING: Some rows remain. Check FK constraints or triggers.");
    } else {
      console.log("╔══════════════════════════════════════════════════════════╗");
      console.log("║                   WIPE COMPLETE ✓                        ║");
      console.log("╚══════════════════════════════════════════════════════════╝");
      console.log("");
      console.log(`  All manager-scoped data for ${scopeLabel} has been removed.`);
      console.log("  Clinics, user accounts, and schema are untouched.");
    }

    console.log("");

  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("\n[wipeManagerData] ✖ Transaction rolled back due to error:");
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }

  process.exit(0);
})();
