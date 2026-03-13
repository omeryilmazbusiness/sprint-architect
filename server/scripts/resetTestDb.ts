/**
 * SAFE TEST DATABASE RESET
 * ========================
 * Drops all tables in the test database, re-runs migrations, then seeds.
 *
 * WILL REFUSE TO RUN unless:
 *   - NODE_ENV === "test"
 *   - DATABASE_URL_TEST is set OR the derived DB name contains "test"
 *   - The DB host does NOT look like a known cloud/prod provider
 *
 * Usage:
 *   NODE_ENV=test npx tsx server/scripts/resetTestDb.ts
 */

import { env, dbUrl } from "../config";
import { pool } from "../db";
import { seedDatabase } from "../seed";

const PROD_LIKE_PATTERNS = [
  "neon.tech",
  "supabase.co",
  "railway.app",
  "render.com",
  "rds.amazonaws.com",
  "digitalocean.com",
];

function abort(reason: string): never {
  console.error(`\n[resetTestDb] REFUSED: ${reason}\n`);
  process.exit(1);
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "(unknown)";
  }
}

function safeDbName(url: string): string {
  try {
    return new URL(url).pathname.slice(1);
  } catch {
    return "(unknown)";
  }
}

(async () => {
  if (!env.isTest) {
    abort(`NODE_ENV must be "test". Got: "${env.nodeEnv}"`);
  }

  const host = safeHost(dbUrl);
  const dbName = safeDbName(dbUrl);

  if (PROD_LIKE_PATTERNS.some((p) => host.includes(p))) {
    abort(`Host "${host}" looks like a production provider. Set DATABASE_URL_TEST to a local/dev database.`);
  }

  if (!dbName.includes("test")) {
    abort(`Database name "${dbName}" must contain "test". Got "${dbName}". Set DATABASE_URL_TEST explicitly.`);
  }

  console.log(`[resetTestDb] Resetting test database: ${host}/${dbName}`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: tables } = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    );

    if (tables.length > 0) {
      const names = tables.map((t) => `"${t.tablename}"`).join(", ");
      console.log(`[resetTestDb] Dropping ${tables.length} table(s): ${names}`);
      await client.query(`DROP TABLE IF EXISTS ${names} CASCADE`);
    } else {
      console.log("[resetTestDb] No tables found — skipping drop.");
    }

    const { rows: seqs } = await client.query<{ relname: string }>(
      `SELECT relname FROM pg_class WHERE relkind = 'S'`,
    );

    if (seqs.length > 0) {
      const names = seqs.map((s) => `"${s.relname}"`).join(", ");
      await client.query(`DROP SEQUENCE IF EXISTS ${names} CASCADE`);
    }

    await client.query("COMMIT");
    console.log("[resetTestDb] Tables dropped.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  console.log("[resetTestDb] Running db:push to recreate schema in test database...");
  const { execSync } = await import("child_process");
  execSync("npx drizzle-kit push --force", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
    },
  });

  console.log("[resetTestDb] Seeding test database...");
  await seedDatabase();

  console.log("[resetTestDb] Done. Test database is clean and seeded.");
  process.exit(0);
})();
