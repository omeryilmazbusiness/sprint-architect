/**
 * SAFE MINIMAL TEST DATABASE RESET
 * =================================
 * Wipes the test DB and seeds ONLY the three essential demo records.
 *
 * REFUSES to run unless:
 *   - NODE_ENV === "test"
 *   - DB name contains "test"
 *   - Host does NOT match known cloud/prod providers
 */

import { env, dbUrl } from "../config";
import { pool } from "../db";
import { hashPassword } from "../auth/password";
import { db } from "../db";
import { clinics, users, patients } from "@shared/schema";
import { eq } from "drizzle-orm";

const PROD_LIKE_PATTERNS = [
  "neon.tech",
  "supabase.co",
  "railway.app",
  "render.com",
  "rds.amazonaws.com",
  "digitalocean.com",
];

function abort(reason: string): never {
  console.error(`\n[resetTestDbMinimal] REFUSED: ${reason}\n`);
  process.exit(1);
}

function safeHost(url: string): string {
  try { return new URL(url).hostname; } catch { return "(unknown)"; }
}

function safeDbName(url: string): string {
  try { return new URL(url).pathname.slice(1); } catch { return "(unknown)"; }
}

(async () => {
  if (!env.isTest) {
    abort(`NODE_ENV must be "test". Got: "${env.nodeEnv}"`);
  }

  const host = safeHost(dbUrl);
  const dbName = safeDbName(dbUrl);

  if (PROD_LIKE_PATTERNS.some((p) => host.includes(p))) {
    abort(`Host "${host}" looks like a production provider.`);
  }

  if (!dbName.includes("test")) {
    abort(`Database name "${dbName}" must contain "test". Set DATABASE_URL_TEST.`);
  }

  console.log(`[resetTestDbMinimal] Resetting: ${host}/${dbName}`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: tables } = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    );

    if (tables.length > 0) {
      const names = tables.map((t: { tablename: string }) => `"${t.tablename}"`).join(", ");
      console.log(`[resetTestDbMinimal] Dropping ${tables.length} table(s)…`);
      await client.query(`DROP TABLE IF EXISTS ${names} CASCADE`);
    }

    await client.query("COMMIT");
    console.log("[resetTestDbMinimal] Tables dropped.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const migrateDb = drizzle(pool);

  try {
    await migrate(migrateDb, { migrationsFolder: "./drizzle" });
    console.log("[resetTestDbMinimal] Migrations applied.");
  } catch {
    console.log("[resetTestDbMinimal] No drizzle folder found — using db:push schema instead.");
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    await promisify(exec)("npx drizzle-kit push --force").catch(() => {
      console.log("[resetTestDbMinimal] drizzle-kit push skipped (schema may already match).");
    });
  }

  const CLINIC_ID = "clinic-test-001";
  const PATIENT_ID = "patient-test-001";
  const PATIENT_KEY = "PATIENT-TEST-0001";

  await db.insert(clinics).values({
    id: CLINIC_ID,
    name: "Test Clinic",
    status: "ACTIVE",
  }).onConflictDoNothing();
  console.log(`[resetTestDbMinimal] ✓ Clinic  : ${CLINIC_ID}`);

  const adminHash = await hashPassword("Admin123!");
  const managerHash = await hashPassword("Manager123!");

  await db.insert(users).values([
    {
      id: "user-test-admin-001",
      email: "admin@demo.com",
      passwordHash: adminHash,
      role: "ADMIN",
      clinicId: null,
      status: "ACTIVE",
    },
    {
      id: "user-test-manager-001",
      email: "manager@demo.com",
      passwordHash: managerHash,
      role: "MANAGER",
      clinicId: CLINIC_ID,
      status: "ACTIVE",
    },
  ]).onConflictDoNothing();
  console.log("[resetTestDbMinimal] ✓ Users   : admin@demo.com, manager@demo.com");

  await db.insert(patients).values({
    id: PATIENT_ID,
    clinicId: CLINIC_ID,
    fullName: "Test Patient",
    patientKey: PATIENT_KEY,
    status: "ACTIVE",
  }).onConflictDoNothing();
  console.log(`[resetTestDbMinimal] ✓ Patient : ${PATIENT_KEY}`);

  await db.update(clinics)
    .set({ primaryManagerUserId: "user-test-manager-001" })
    .where(eq(clinics.id, CLINIC_ID));

  const client2 = await pool.connect();
  const allTables: string[] = [];
  try {
    const { rows } = await client2.query<{ tablename: string; count: string }>(
      `SELECT t.tablename,
              (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = t.tablename)::text AS count
       FROM pg_tables t WHERE schemaname = 'public' ORDER BY tablename`,
    );
    for (const r of rows) {
      const { rows: cnt } = await client2.query(
        `SELECT COUNT(*) AS n FROM "${r.tablename}"`,
      );
      const n = cnt[0]?.n ?? "?";
      if (Number(n) > 0) {
        allTables.push(`  ${r.tablename.padEnd(30)} ${n} row(s)`);
      }
    }
  } finally {
    client2.release();
  }

  console.log("\n[resetTestDbMinimal] Non-empty tables after minimal seed:");
  allTables.forEach((l) => console.log(l));
  console.log("\n[resetTestDbMinimal] ✓ Done. Only 3 entities seeded (1 clinic, 2 users, 1 patient).");
  process.exit(0);
})();
