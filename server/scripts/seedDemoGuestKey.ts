/**
 * DEMO GUEST SEED — Idempotent
 * ============================
 * Creates one demo patient record so you can log in immediately from the
 * Guest login screen without touching any other data.
 *
 * Demo key : PT-4S9WQ2U6
 * Status   : ACTIVE  (required for patient login)
 *
 * Usage:
 *   npm run db:seed:demo-guest
 */

import { db } from "../db";
import { clinics, patients } from "@shared/schema";
import { eq } from "drizzle-orm";

const DEMO_CLINIC_ID = "clinic-demo-001";
const DEMO_CLINIC_NAME = "Demo Clinic";

const DEMO_PATIENT_KEY = "PT-4S9WQ2U6";
const DEMO_PATIENT_FULL_NAME = "Demo Guest";

(async () => {
  if (process.env.NODE_ENV === "production") {
    console.error("[seedDemoGuest] Refusing to run in production.");
    process.exit(1);
  }

  // ── 1. Ensure demo clinic exists ─────────────────────────────────────────
  const existingClinic = await db.query.clinics.findFirst({
    where: eq(clinics.id, DEMO_CLINIC_ID),
  });

  if (!existingClinic) {
    await db.insert(clinics).values({
      id: DEMO_CLINIC_ID,
      name: DEMO_CLINIC_NAME,
      status: "ACTIVE",
    });
    console.log(`[seedDemoGuest] Created clinic: ${DEMO_CLINIC_NAME}`);
  } else if (existingClinic.status === "SUSPENDED") {
    await db
      .update(clinics)
      .set({ status: "ACTIVE" })
      .where(eq(clinics.id, DEMO_CLINIC_ID));
    console.log(`[seedDemoGuest] Restored clinic status to ACTIVE`);
  } else {
    console.log(
      `[seedDemoGuest] Clinic already exists: ${existingClinic.name}`
    );
  }

  // ── 2. Find or create demo patient ───────────────────────────────────────
  const existingPatient = await db.query.patients.findFirst({
    where: eq(patients.patientKey, DEMO_PATIENT_KEY),
  });

  if (existingPatient) {
    const needsUpdate =
      existingPatient.status !== "ACTIVE" ||
      existingPatient.clinicId !== DEMO_CLINIC_ID;

    if (needsUpdate) {
      await db
        .update(patients)
        .set({ status: "ACTIVE", clinicId: DEMO_CLINIC_ID })
        .where(eq(patients.patientKey, DEMO_PATIENT_KEY));
      console.log(`[seedDemoGuest] Updated existing patient → status=ACTIVE`);
    } else {
      console.log(
        `[seedDemoGuest] Patient already exists with correct status. Nothing to do.`
      );
    }
  } else {
    await db.insert(patients).values({
      clinicId: DEMO_CLINIC_ID,
      fullName: DEMO_PATIENT_FULL_NAME,
      patientKey: DEMO_PATIENT_KEY,
      status: "ACTIVE",
      nationality: "Turkey",
      phoneE164: "+905000000000",
    } as any);
    console.log(`[seedDemoGuest] Created patient: ${DEMO_PATIENT_FULL_NAME}`);
  }

  // ── 3. Summary ───────────────────────────────────────────────────────────
  console.log(``);
  console.log(`┌─────────────────────────────────────┐`);
  console.log(`│   Demo Guest Key ready               │`);
  console.log(`│                                     │`);
  console.log(`│   Key   : ${DEMO_PATIENT_KEY}           │`);
  console.log(`│   Clinic: ${DEMO_CLINIC_NAME}             │`);
  console.log(`│   Status: ACTIVE                    │`);
  console.log(`└─────────────────────────────────────┘`);
  console.log(``);
  console.log(`How to test:`);
  console.log(`  1. Open the app → Guest Login tab`);
  console.log(`  2. Enter key: ${DEMO_PATIENT_KEY}`);
  console.log(`  3. Tap Sign In`);

  process.exit(0);
})();
