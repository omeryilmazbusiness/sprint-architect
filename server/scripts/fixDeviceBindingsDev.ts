/**
 * FIX DEVICE BINDINGS — Dev cleanup utility
 * ==========================================
 * Detects and fixes stale / duplicate device binding rows in development.
 *
 * Modes:
 *   DRY-RUN (default): shows what would be changed, touches nothing.
 *   EXECUTE: set FIX_CONFIRM="YES_FIX_BINDINGS" to apply changes.
 *
 * Usage (dry-run):
 *   NODE_ENV=development tsx server/scripts/fixDeviceBindingsDev.ts
 *
 * Usage (execute):
 *   FIX_CONFIRM="YES_FIX_BINDINGS" NODE_ENV=development tsx server/scripts/fixDeviceBindingsDev.ts
 *
 * Safety guards:
 *   - Refuses to run in NODE_ENV=production
 *   - Refuses if DATABASE_URL database name contains "prod"
 */

import { db } from "../db";
import { patients, devices } from "@shared/schema";
import { eq } from "drizzle-orm";

function runGuards() {
  if (process.env.NODE_ENV === "production") {
    console.error("[fixDeviceBindings] ✗ Refusing to run in NODE_ENV=production.");
    process.exit(1);
  }
  const dbUrl = process.env.DATABASE_URL ?? "";
  const dbName = dbUrl.split("/").pop()?.split("?")[0] ?? "";
  if (dbName.includes("prod")) {
    console.error(`[fixDeviceBindings] ✗ Database name "${dbName}" contains "prod". Aborting.`);
    process.exit(1);
  }
}

(async () => {
  runGuards();

  const isDryRun = process.env.FIX_CONFIRM !== "YES_FIX_BINDINGS";
  if (isDryRun) {
    console.log(`[fixDeviceBindings] DRY-RUN mode (set FIX_CONFIRM="YES_FIX_BINDINGS" to execute)`);
  } else {
    console.log(`[fixDeviceBindings] LIVE mode — will revoke stale bindings`);
  }

  // Load all patients with their device rows
  const allPatients = await db.query.patients.findMany({
    with: { devices: true },
  });

  let totalStale = 0;
  let totalFixed = 0;

  for (const patient of allPatients) {
    const allDevices = (patient as any).devices as Array<{
      id: string;
      deviceId: string;
      boundAt: Date;
      revokedAt: Date | null;
    }>;

    if (!allDevices || allDevices.length === 0) continue;

    const activeDevices = allDevices.filter((d) => d.revokedAt === null);

    // Flag: multiple active device rows for same patient (should be 0 or 1)
    if (activeDevices.length > 1) {
      console.log(
        `[fixDeviceBindings] Patient "${patient.fullName}" (${patient.patientKey}) has ${activeDevices.length} active bindings — keeping newest, revoking rest`
      );

      // Keep the most recently bound, revoke the rest
      const sorted = activeDevices.sort(
        (a, b) => new Date(b.boundAt).getTime() - new Date(a.boundAt).getTime()
      );
      const toRevoke = sorted.slice(1);
      totalStale += toRevoke.length;

      if (!isDryRun) {
        for (const d of toRevoke) {
          await db
            .update(devices)
            .set({ revokedAt: new Date() })
            .where(eq(devices.id, d.id));
          totalFixed++;
        }
        console.log(
          `[fixDeviceBindings]   → Revoked ${toRevoke.length} stale binding(s)`
        );
      } else {
        console.log(
          `[fixDeviceBindings]   → Would revoke ${toRevoke.length} stale binding(s) (dry-run)`
        );
      }
    }
  }

  console.log(``);
  if (isDryRun) {
    console.log(`[fixDeviceBindings] DRY-RUN complete.`);
    console.log(`[fixDeviceBindings]   Stale bindings found: ${totalStale}`);
    console.log(`[fixDeviceBindings]   To execute: add FIX_CONFIRM="YES_FIX_BINDINGS"`);
  } else {
    console.log(`[fixDeviceBindings] ✓ Done.`);
    console.log(`[fixDeviceBindings]   Stale bindings revoked: ${totalFixed}`);
  }

  process.exit(0);
})();
