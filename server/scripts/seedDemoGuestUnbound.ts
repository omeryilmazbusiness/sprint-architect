/**
 * DEMO GUEST SEED (UNBOUND) — Idempotent
 * =======================================
 * Creates one demo patient that is guaranteed to have NO device binding,
 * so it can be used immediately from any device in development.
 *
 * Fixed demo key : PT-DEMO0001
 * Patient status : ACTIVE  (required by patient login endpoint)
 *
 * Usage:
 *   NODE_ENV=development tsx server/scripts/seedDemoGuestUnbound.ts
 *
 * Safety guards:
 *   - Refuses to run in NODE_ENV=production
 *   - Refuses if DATABASE_URL database name contains "prod"
 */

import { db } from "../db";
import { clinics, patients, devices, refreshTokens } from "@shared/schema";
import { eq } from "drizzle-orm";

// ── Constants ────────────────────────────────────────────────────────────────
const DEMO_CLINIC_ID = "clinic-demo-001";
const DEMO_CLINIC_NAME = "Demo Clinic";
const DEMO_PATIENT_KEY = "PT-DEMO0001";
const DEMO_PATIENT_NAME = "Demo Guest";

// ── Guards ────────────────────────────────────────────────────────────────────
function runGuards() {
  if (process.env.NODE_ENV === "production") {
    console.error("[seedDemoGuestUnbound] ✗ Refusing to run in NODE_ENV=production.");
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL ?? "";
  const dbName = dbUrl.split("/").pop()?.split("?")[0] ?? "";
  if (dbName.includes("prod")) {
    console.error(`[seedDemoGuestUnbound] ✗ Database name "${dbName}" contains "prod". Aborting.`);
    process.exit(1);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  runGuards();

  // 1. Ensure demo clinic exists and is ACTIVE
  const existingClinic = await db.query.clinics.findFirst({
    where: eq(clinics.id, DEMO_CLINIC_ID),
  });

  if (!existingClinic) {
    await db.insert(clinics).values({
      id: DEMO_CLINIC_ID,
      name: DEMO_CLINIC_NAME,
      status: "ACTIVE",
    });
    console.log(`[seedDemoGuestUnbound] Created clinic: ${DEMO_CLINIC_NAME}`);
  } else if (existingClinic.status === "SUSPENDED") {
    await db
      .update(clinics)
      .set({ status: "ACTIVE" })
      .where(eq(clinics.id, DEMO_CLINIC_ID));
    console.log(`[seedDemoGuestUnbound] Restored clinic to ACTIVE`);
  } else {
    console.log(`[seedDemoGuestUnbound] Clinic OK: ${existingClinic.name}`);
  }

  // 2. Find or create demo patient
  let demoPatient = await db.query.patients.findFirst({
    where: eq(patients.patientKey, DEMO_PATIENT_KEY),
  });

  if (!demoPatient) {
    const [created] = await db
      .insert(patients)
      .values({
        clinicId: DEMO_CLINIC_ID,
        fullName: DEMO_PATIENT_NAME,
        patientKey: DEMO_PATIENT_KEY,
        status: "ACTIVE",
        nationality: "Turkey",
        phoneE164: "+905000000000",
      } as any)
      .returning();
    demoPatient = created;
    console.log(`[seedDemoGuestUnbound] Created patient: ${DEMO_PATIENT_NAME} (${DEMO_PATIENT_KEY})`);
  } else {
    // Ensure correct status and clinic
    if (demoPatient.status !== "ACTIVE" || demoPatient.clinicId !== DEMO_CLINIC_ID) {
      await db
        .update(patients)
        .set({ status: "ACTIVE", clinicId: DEMO_CLINIC_ID })
        .where(eq(patients.patientKey, DEMO_PATIENT_KEY));
      console.log(`[seedDemoGuestUnbound] Updated patient status to ACTIVE`);
    } else {
      console.log(`[seedDemoGuestUnbound] Patient already exists: ${demoPatient.fullName}`);
    }
  }

  const patientId = demoPatient.id;

  // 3. CRITICAL: Clear all device bindings for this patient
  const existingDevices = await db.query.devices.findMany({
    where: eq(devices.patientId, patientId),
  });

  if (existingDevices.length > 0) {
    await db.delete(devices).where(eq(devices.patientId, patientId));
    console.log(`[seedDemoGuestUnbound] Cleared ${existingDevices.length} device binding(s)`);
  } else {
    console.log(`[seedDemoGuestUnbound] No device bindings to clear`);
  }

  // 4. Clear all refresh tokens for this patient
  const existingTokens = await db.query.refreshTokens.findMany({
    where: eq(refreshTokens.patientId, patientId),
  });

  if (existingTokens.length > 0) {
    await db.delete(refreshTokens).where(eq(refreshTokens.patientId, patientId));
    console.log(`[seedDemoGuestUnbound] Cleared ${existingTokens.length} refresh token(s)`);
  } else {
    console.log(`[seedDemoGuestUnbound] No refresh tokens to clear`);
  }

  // 5. Summary
  console.log(``);
  console.log(`┌──────────────────────────────────────────────────┐`);
  console.log(`│   DEMO GUEST KEY READY (UNBOUND)                 │`);
  console.log(`│                                                  │`);
  console.log(`│   Key    : ${DEMO_PATIENT_KEY}                        │`);
  console.log(`│   Name   : ${DEMO_PATIENT_NAME}                      │`);
  console.log(`│   Status : ACTIVE                                │`);
  console.log(`│   Clinic : ${DEMO_CLINIC_NAME}                    │`);
  console.log(`│                                                  │`);
  console.log(`│   This key is unbound — works on any device.     │`);
  console.log(`└──────────────────────────────────────────────────┘`);
  console.log(``);
  console.log(`How to test:`);
  console.log(`  1. Open app → Guest Login tab`);
  console.log(`  2. Enter key: ${DEMO_PATIENT_KEY}`);
  console.log(`  3. Tap Sign In`);
  console.log(``);
  console.log(`Note: First device to log in will bind the key.`);
  console.log(`      Re-run this script to unbind and start fresh.`);

  process.exit(0);
})();
