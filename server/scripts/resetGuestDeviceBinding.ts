/**
 * RESET GUEST DEVICE BINDING — Dev utility
 * ==========================================
 * Clears device bindings and refresh tokens for a patient by patientKey.
 * Safe dry-run by default; requires explicit confirmation to execute.
 *
 * Usage (dry-run):
 *   PATIENT_KEY="PT-DEMO0001" NODE_ENV=development tsx server/scripts/resetGuestDeviceBinding.ts
 *
 * Usage (execute reset):
 *   PATIENT_KEY="PT-DEMO0001" RESET_CONFIRM="YES_RESET_BINDING" NODE_ENV=development tsx server/scripts/resetGuestDeviceBinding.ts
 *
 * Safety guards:
 *   - Refuses to run in NODE_ENV=production
 *   - Dry-run by default unless RESET_CONFIRM="YES_RESET_BINDING"
 *   - Refuses if database name contains "prod"
 */

import { db } from "../db";
import { patients, devices, refreshTokens } from "@shared/schema";
import { eq } from "drizzle-orm";

// ── Guards ────────────────────────────────────────────────────────────────────
function runGuards() {
  if (process.env.NODE_ENV === "production") {
    console.error("[resetBinding] ✗ Refusing to run in NODE_ENV=production.");
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL ?? "";
  const dbName = dbUrl.split("/").pop()?.split("?")[0] ?? "";
  if (dbName.includes("prod")) {
    console.error(`[resetBinding] ✗ Database name "${dbName}" contains "prod". Aborting.`);
    process.exit(1);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  runGuards();

  const patientKey = process.env.PATIENT_KEY?.trim();
  if (!patientKey) {
    console.error("[resetBinding] ✗ PATIENT_KEY env var is required.");
    console.error("  Example: PATIENT_KEY=\"PT-DEMO0001\" NODE_ENV=development tsx server/scripts/resetGuestDeviceBinding.ts");
    process.exit(1);
  }

  const isDryRun = process.env.RESET_CONFIRM !== "YES_RESET_BINDING";

  if (isDryRun) {
    console.log(`[resetBinding] DRY-RUN mode (set RESET_CONFIRM="YES_RESET_BINDING" to execute)`);
  } else {
    console.log(`[resetBinding] LIVE mode — will delete bindings`);
  }

  // Find patient
  const patient = await db.query.patients.findFirst({
    where: eq(patients.patientKey, patientKey),
  });

  if (!patient) {
    console.error(`[resetBinding] ✗ Patient not found for key: ${patientKey}`);
    process.exit(1);
  }

  console.log(`[resetBinding] Found patient: ${patient.fullName} (${patient.id})`);
  console.log(`[resetBinding]   Status  : ${patient.status}`);
  console.log(`[resetBinding]   ClinicId: ${patient.clinicId}`);

  // Count device bindings
  const boundDevices = await db.query.devices.findMany({
    where: eq(devices.patientId, patient.id),
  });
  const activeDevices = boundDevices.filter((d) => d.revokedAt === null);

  console.log(`[resetBinding] Device bindings    : ${boundDevices.length} total, ${activeDevices.length} active`);

  if (activeDevices.length > 0) {
    for (const d of activeDevices) {
      const maskedId = d.deviceId.slice(0, 8) + "...";
      console.log(`[resetBinding]   - Active device: ${maskedId} (bound ${d.boundAt.toISOString()})`);
    }
  }

  // Count refresh tokens
  const tokens = await db.query.refreshTokens.findMany({
    where: eq(refreshTokens.patientId, patient.id),
  });
  const activeTokens = tokens.filter((t) => t.revokedAt === null);

  console.log(`[resetBinding] Refresh tokens     : ${tokens.length} total, ${activeTokens.length} active`);

  if (isDryRun) {
    console.log(``);
    console.log(`[resetBinding] DRY-RUN complete. No changes made.`);
    console.log(`[resetBinding] To execute: add RESET_CONFIRM="YES_RESET_BINDING"`);
    process.exit(0);
  }

  // Execute reset
  const deletedDevices = await db
    .delete(devices)
    .where(eq(devices.patientId, patient.id))
    .returning();

  const deletedTokens = await db
    .delete(refreshTokens)
    .where(eq(refreshTokens.patientId, patient.id))
    .returning();

  console.log(``);
  console.log(`[resetBinding] ✓ Deleted ${deletedDevices.length} device binding(s)`);
  console.log(`[resetBinding] ✓ Deleted ${deletedTokens.length} refresh token(s)`);
  console.log(`[resetBinding] ✓ Patient "${patient.fullName}" (${patientKey}) is now unbound.`);
  console.log(`[resetBinding]   They can log in fresh from any device.`);

  process.exit(0);
})();
