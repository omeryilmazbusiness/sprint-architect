/**
 * DOCTORS + GUESTS (PATIENTS) WIPE SCRIPT
 * ========================================
 * Deletes doctors and patients (guests) — and all their dependent rows —
 * from the database. Schema, clinics, user accounts, and all other tables
 * are NEVER touched.
 *
 * ⚠️  IRREVERSIBLE.  There is no undo. ⚠️
 *
 * SAFETY GUARDS (all must pass for a real run):
 *   1. NODE_ENV must NOT be "test"
 *   2. Database name must NOT contain "test"
 *   3. WIPE_CONFIRM must equal "YES_WIPE_DOCTORS_GUESTS"
 *      → anything else = DRY-RUN only, no changes, exits 0
 *
 * SCOPE:
 *   Specific clinic : WIPE_CLINIC_ID="<id>" ... (uses DELETE WHERE clinic_id)
 *   All clinics     : (no WIPE_CLINIC_ID)       (uses DELETE without WHERE)
 *
 * FK-SAFE DELETE ORDER:
 *   1. patient_documents   (refs patients, document_types)
 *   2. appointments        (refs patients, doctors)
 *   3. patient_plans       (refs patients, doctors, hotels, transports)
 *   4. credential_requests (refs patients)
 *   5. refresh_tokens      (patient-linked only)
 *   6. devices             (refs patients)
 *   7. patients            (parent of all above)
 *   8. doctors             (parent of appointments + patient_plans)
 *
 * Usage:
 *   # Dry-run (default — no changes):
 *   NODE_ENV=development tsx server/scripts/wipeDoctorsAndGuests.ts
 *
 *   # Real wipe — all clinics:
 *   WIPE_CONFIRM=YES_WIPE_DOCTORS_GUESTS NODE_ENV=development tsx server/scripts/wipeDoctorsAndGuests.ts
 *
 *   # Dry-run — single clinic:
 *   WIPE_CLINIC_ID="<id>" NODE_ENV=development tsx server/scripts/wipeDoctorsAndGuests.ts
 *
 *   # Real wipe — single clinic:
 *   WIPE_CLINIC_ID="<id>" WIPE_CONFIRM=YES_WIPE_DOCTORS_GUESTS NODE_ENV=development tsx server/scripts/wipeDoctorsAndGuests.ts
 */

import { env, dbUrl } from "../config";
import { pool } from "../db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function abort(reason: string): never {
  console.error(`\n[wipeDoctorsAndGuests] ✖ REFUSED: ${reason}\n`);
  process.exit(1);
}

function safeDbName(url: string): string {
  try { return new URL(url).pathname.slice(1); } catch { return "(unparseable)"; }
}

function safeSummary(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/[a-z0-9]/gi, (c, i) => i > 2 ? "*" : c);
    return `${host}:${u.port || "5432"}/${u.pathname.slice(1)}`;
  } catch { return "(unparseable)"; }
}

type QueryClient = Awaited<ReturnType<typeof pool.connect>>;

// ─── Count / delete building blocks ──────────────────────────────────────────

async function count(client: QueryClient, sql: string, params: unknown[] = []): Promise<number> {
  const { rows } = await client.query<{ c: string }>(sql, params);
  return parseInt(rows[0].c, 10);
}

async function del(client: QueryClient, sql: string, params: unknown[] = []): Promise<number> {
  const result = await client.query(sql, params);
  return result.rowCount ?? 0;
}

// ─── Snapshot: how many rows exist for the chosen scope ──────────────────────

interface Snapshot {
  doctors:           number;
  patients:          number;
  patient_documents: number;
  appointments:      number;
  patient_plans:     number;
  credential_reqs:   number;
  refresh_tokens:    number;
  devices:           number;
}

async function snapshot(client: QueryClient, clinicId: string | null): Promise<Snapshot> {
  if (clinicId) {
    const [
      doctors, patients, patient_documents, appointments,
      patient_plans, credential_reqs, refresh_tokens, devices,
    ] = await Promise.all([
      count(client, `SELECT COUNT(*)::text AS c FROM doctors            WHERE clinic_id = $1`, [clinicId]),
      count(client, `SELECT COUNT(*)::text AS c FROM patients           WHERE clinic_id = $1`, [clinicId]),
      count(client, `SELECT COUNT(*)::text AS c FROM patient_documents  WHERE clinic_id = $1`, [clinicId]),
      count(client, `SELECT COUNT(*)::text AS c FROM appointments       WHERE clinic_id = $1`, [clinicId]),
      count(client, `SELECT COUNT(*)::text AS c FROM patient_plans      WHERE clinic_id = $1`, [clinicId]),
      count(client, `SELECT COUNT(*)::text AS c FROM credential_requests WHERE clinic_id = $1`, [clinicId]),
      count(client, `SELECT COUNT(*)::text AS c FROM refresh_tokens     WHERE patient_id IN (SELECT id FROM patients WHERE clinic_id = $1)`, [clinicId]),
      count(client, `SELECT COUNT(*)::text AS c FROM devices            WHERE patient_id IN (SELECT id FROM patients WHERE clinic_id = $1)`, [clinicId]),
    ]);
    return { doctors, patients, patient_documents, appointments, patient_plans, credential_reqs, refresh_tokens, devices };
  } else {
    const [
      doctors, patients, patient_documents, appointments,
      patient_plans, credential_reqs, refresh_tokens, devices,
    ] = await Promise.all([
      count(client, `SELECT COUNT(*)::text AS c FROM doctors`),
      count(client, `SELECT COUNT(*)::text AS c FROM patients`),
      count(client, `SELECT COUNT(*)::text AS c FROM patient_documents`),
      count(client, `SELECT COUNT(*)::text AS c FROM appointments`),
      count(client, `SELECT COUNT(*)::text AS c FROM patient_plans`),
      count(client, `SELECT COUNT(*)::text AS c FROM credential_requests`),
      count(client, `SELECT COUNT(*)::text AS c FROM refresh_tokens WHERE patient_id IS NOT NULL`),
      count(client, `SELECT COUNT(*)::text AS c FROM devices        WHERE patient_id IS NOT NULL`),
    ]);
    return { doctors, patients, patient_documents, appointments, patient_plans, credential_reqs, refresh_tokens, devices };
  }
}

function printSnapshot(label: string, s: Snapshot) {
  const total = Object.values(s).reduce((a, b) => a + b, 0);
  console.log(`\n  ${label}`);
  console.log("  ─────────────────────────────────────────────────────");
  console.log(`  ${"doctors".padEnd(28)}   ${String(s.doctors).padStart(6)} rows`);
  console.log(`  ${"patients".padEnd(28)}  ${String(s.patients).padStart(6)} rows`);
  console.log(`  ${"patient_documents".padEnd(28)}  ${String(s.patient_documents).padStart(6)} rows`);
  console.log(`  ${"appointments".padEnd(28)}  ${String(s.appointments).padStart(6)} rows`);
  console.log(`  ${"patient_plans".padEnd(28)}  ${String(s.patient_plans).padStart(6)} rows`);
  console.log(`  ${"credential_requests".padEnd(28)}  ${String(s.credential_reqs).padStart(6)} rows`);
  console.log(`  ${"refresh_tokens (patient)".padEnd(28)}  ${String(s.refresh_tokens).padStart(6)} rows`);
  console.log(`  ${"devices (patient)".padEnd(28)}  ${String(s.devices).padStart(6)} rows`);
  console.log("  ─────────────────────────────────────────────────────");
  console.log(`  ${"TOTAL".padEnd(28)}  ${String(total).padStart(6)} rows`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  // Guard 1: not test environment
  if (env.isTest) {
    abort(
      `NODE_ENV is "test".\n` +
      `  This script is for development only and will never touch the test database.`,
    );
  }

  // Guard 2: database name must not contain "test"
  const dbName = safeDbName(dbUrl);
  if (dbName.toLowerCase().includes("test")) {
    abort(
      `Database name "${dbName}" contains "test".\n` +
      `  This script refuses to operate against a test database.\n` +
      `  Double-check your DATABASE_URL environment variable.`,
    );
  }

  const dbSummary  = safeSummary(dbUrl);
  const confirmed  = process.env.WIPE_CONFIRM === "YES_WIPE_DOCTORS_GUESTS";
  const isDryRun   = !confirmed;
  const clinicId   = process.env.WIPE_CLINIC_ID?.trim() || null;
  const scopeLabel = clinicId ? `clinic "${clinicId}"` : "ALL clinics";
  const modeLabel  = isDryRun
    ? "DRY-RUN  (no changes — set WIPE_CONFIRM=YES_WIPE_DOCTORS_GUESTS for real wipe)"
    : "⚠️  REAL WIPE — DATA WILL BE PERMANENTLY DELETED";

  console.log("");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║     DOCTORS + GUESTS WIPE — HealthTour SaaS             ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`  Database : ${dbSummary}`);
  console.log(`  Scope    : ${scopeLabel}`);
  console.log(`  Mode     : ${modeLabel}`);

  const client = await pool.connect();

  try {
    // ── Snapshot BEFORE ───────────────────────────────────────────────────────
    const before = await snapshot(client, clinicId);
    printSnapshot(isDryRun ? "Rows that WOULD be deleted:" : "Rows BEFORE wipe:", before);

    const totalBefore = Object.values(before).reduce((a, b) => a + b, 0);

    if (isDryRun) {
      console.log("");
      console.log("  DRY-RUN complete. Zero changes made.");
      console.log("");
      console.log("  To run the real wipe:");
      if (clinicId) {
        console.log(`    WIPE_CLINIC_ID="${clinicId}" WIPE_CONFIRM=YES_WIPE_DOCTORS_GUESTS NODE_ENV=development tsx server/scripts/wipeDoctorsAndGuests.ts`);
      } else {
        console.log("    WIPE_CONFIRM=YES_WIPE_DOCTORS_GUESTS NODE_ENV=development tsx server/scripts/wipeDoctorsAndGuests.ts");
      }
      console.log("");
      process.exit(0);
    }

    if (totalBefore === 0) {
      console.log("");
      console.log("  Nothing to delete — all counts are already 0.");
      console.log("");
      process.exit(0);
    }

    // ── REAL WIPE — transactional, FK-safe order ──────────────────────────────
    console.log("");
    console.log("  Starting transaction...");

    await client.query("BEGIN");

    const deleted: Record<string, number> = {};

    try {
      if (clinicId) {
        // Clinic-scoped: DELETE WHERE
        deleted.patient_documents   = await del(client, `DELETE FROM patient_documents   WHERE clinic_id = $1`, [clinicId]);
        deleted.appointments        = await del(client, `DELETE FROM appointments        WHERE clinic_id = $1`, [clinicId]);
        deleted.patient_plans       = await del(client, `DELETE FROM patient_plans       WHERE clinic_id = $1`, [clinicId]);
        deleted.credential_requests = await del(client, `DELETE FROM credential_requests WHERE clinic_id = $1`, [clinicId]);
        deleted.refresh_tokens      = await del(client,
          `DELETE FROM refresh_tokens WHERE patient_id IN (SELECT id FROM patients WHERE clinic_id = $1)`, [clinicId]);
        deleted.devices             = await del(client,
          `DELETE FROM devices WHERE patient_id IN (SELECT id FROM patients WHERE clinic_id = $1)`, [clinicId]);
        deleted.patients            = await del(client, `DELETE FROM patients WHERE clinic_id = $1`, [clinicId]);
        deleted.doctors             = await del(client, `DELETE FROM doctors  WHERE clinic_id = $1`, [clinicId]);
      } else {
        // Full wipe: DELETE all rows (FK-safe order, explicit counts)
        deleted.patient_documents   = await del(client, `DELETE FROM patient_documents`);
        deleted.appointments        = await del(client, `DELETE FROM appointments`);
        deleted.patient_plans       = await del(client, `DELETE FROM patient_plans`);
        deleted.credential_requests = await del(client, `DELETE FROM credential_requests`);
        deleted.refresh_tokens      = await del(client, `DELETE FROM refresh_tokens WHERE patient_id IS NOT NULL`);
        deleted.devices             = await del(client, `DELETE FROM devices        WHERE patient_id IS NOT NULL`);
        deleted.patients            = await del(client, `DELETE FROM patients`);
        deleted.doctors             = await del(client, `DELETE FROM doctors`);
      }

      await client.query("COMMIT");
      console.log("  Transaction COMMITTED ✓");

    } catch (err: unknown) {
      await client.query("ROLLBACK");
      const msg = err instanceof Error ? err.message : String(err);
      console.error("");
      console.error(`  ✖ Transaction ROLLED BACK — error during delete:`);
      console.error(`    ${msg}`);
      console.error("");
      console.error("  Hint: check FK constraint order or re-run with more verbose logging.");
      process.exit(1);
    }

    // ── Deleted-per-table summary ─────────────────────────────────────────────
    console.log("");
    console.log("  Rows deleted per table:");
    console.log("  ─────────────────────────────────────────────────────");
    let totalDeleted = 0;
    for (const [tbl, n] of Object.entries(deleted)) {
      totalDeleted += n;
      console.log(`  ${tbl.padEnd(30)} ${String(n).padStart(6)} rows deleted`);
    }
    console.log("  ─────────────────────────────────────────────────────");
    console.log(`  ${"TOTAL".padEnd(30)} ${String(totalDeleted).padStart(6)} rows deleted`);

    // ── Snapshot AFTER (proof that counts are 0) ──────────────────────────────
    const after = await snapshot(client, clinicId);
    printSnapshot("Post-wipe verification (all must be 0):", after);

    const totalAfter = Object.values(after).reduce((a, b) => a + b, 0);
    const hasRemnants = totalAfter > 0;

    console.log("");
    if (hasRemnants) {
      console.log("  ⚠️  WARNING: some rows remain after wipe — see counts above.");
      console.log("  This may indicate an unhandled FK constraint or a scope mismatch.");
      process.exit(1);
    } else {
      console.log("╔══════════════════════════════════════════════════════════╗");
      console.log("║              WIPE COMPLETE — ALL COUNTS = 0 ✓            ║");
      console.log("╚══════════════════════════════════════════════════════════╝");
      console.log("");
      console.log(`  Doctors and guests for ${scopeLabel} have been removed.`);
      console.log("  Clinics, user accounts, document types, hotels, transports");
      console.log("  and all other tables are untouched.");
    }

    console.log("");

  } finally {
    client.release();
    await pool.end();
  }

  process.exit(0);
})();
