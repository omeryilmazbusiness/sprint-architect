/**
 * One-shot production prep for App Store review (Individual account).
 *
 *   ALLOW_PROD_DEMO_SEED=1 DATABASE_URL=<prod> npx tsx server/scripts/ensureProdAppleReviewReady.ts
 */
import { db } from "../db";
import {
  clinics,
  documentTypes,
  patientDocuments,
  patients,
  doctors,
  appointments,
} from "@shared/schema";
import { eq, inArray, and } from "drizzle-orm";
import { authRepo } from "../repositories/authRepo";
import { departureRetentionFields } from "../modules/guestRetention";
import {
  COMMUNITY_UPLOAD_TYPE_PRESETS,
  isSensitiveDocumentType,
} from "@shared/communityUploadTypes";

const DEMO_CLINIC_ID = "clinic-demo-001";
const DEMO_CLINIC_NAME = "Demo Community";
const DEMO_KEY = "PT-4S9WQ2U6";
const DEMO_NAME = "Demo Member";
const DEMO_DEPARTURE = "2099-12-31";

async function main() {
  if (process.env.ALLOW_PROD_DEMO_SEED !== "1") {
    console.error("[ensure] Set ALLOW_PROD_DEMO_SEED=1");
    process.exit(1);
  }

  // 1) Clinic active + name
  const clinic = await db.query.clinics.findFirst({
    where: eq(clinics.id, DEMO_CLINIC_ID),
  });
  if (!clinic) {
    await db.insert(clinics).values({
      id: DEMO_CLINIC_ID,
      name: DEMO_CLINIC_NAME,
      status: "ACTIVE",
    });
    console.log("[ensure] Created demo clinic");
  } else {
    await db
      .update(clinics)
      .set({ name: DEMO_CLINIC_NAME, status: "ACTIVE" })
      .where(eq(clinics.id, DEMO_CLINIC_ID));
    console.log("[ensure] Clinic OK:", DEMO_CLINIC_NAME);
  }

  // 2) Remove sensitive upload types + assignments
  let rows = await db.query.documentTypes.findMany({
    where: eq(documentTypes.clinicId, DEMO_CLINIC_ID),
  });
  const sensitiveIds = rows
    .filter((r) => isSensitiveDocumentType(r.name, r.code))
    .map((r) => r.id);
  if (sensitiveIds.length) {
    await db
      .delete(patientDocuments)
      .where(inArray(patientDocuments.documentTypeId, sensitiveIds));
    await db.delete(documentTypes).where(inArray(documentTypes.id, sensitiveIds));
    console.log(`[ensure] Removed ${sensitiveIds.length} sensitive upload type(s)`);
    rows = await db.query.documentTypes.findMany({
      where: eq(documentTypes.clinicId, DEMO_CLINIC_ID),
    });
  }

  for (const preset of COMMUNITY_UPLOAD_TYPE_PRESETS) {
    const exists = await db.query.documentTypes.findFirst({
      where: and(
        eq(documentTypes.clinicId, DEMO_CLINIC_ID),
        eq(documentTypes.code, preset.code),
      ),
    });
    if (!exists) {
      await db.insert(documentTypes).values({
        clinicId: DEMO_CLINIC_ID,
        name: preset.name,
        code: preset.code,
        isRequired: preset.isRequired,
      });
      console.log(`[ensure] Added upload type: ${preset.name}`);
    }
  }

  // 3) Demo member
  let demo = await db.query.patients.findFirst({
    where: eq(patients.patientKey, DEMO_KEY),
  });
  if (!demo) {
    const [created] = await db
      .insert(patients)
      .values({
        clinicId: DEMO_CLINIC_ID,
        fullName: DEMO_NAME,
        patientKey: DEMO_KEY,
        status: "ACTIVE",
        phoneE164: "+905000000000",
        departureDate: DEMO_DEPARTURE,
        passportNo: null,
        ...departureRetentionFields(DEMO_DEPARTURE),
      })
      .returning();
    demo = created;
    console.log("[ensure] Created demo member");
  } else {
    await db
      .update(patients)
      .set({
        fullName: DEMO_NAME,
        status: "ACTIVE",
        clinicId: DEMO_CLINIC_ID,
        departureDate: DEMO_DEPARTURE,
        passportNo: null,
        ...departureRetentionFields(DEMO_DEPARTURE),
      })
      .where(eq(patients.id, demo.id));
    console.log("[ensure] Updated demo member (name, no passport)");
  }

  await authRepo.revokeDevice(demo.id);
  console.log("[ensure] Cleared device bindings for demo member");

  // 4) Community events for member dashboard (if none)
  const existingAppts = await db.query.appointments.findMany({
    where: eq(appointments.patientId, demo.id),
    limit: 1,
  });
  if (existingAppts.length === 0) {
    let host = await db.query.doctors.findFirst({
      where: eq(doctors.clinicId, DEMO_CLINIC_ID),
    });
    if (!host) {
      const [created] = await db
        .insert(doctors)
        .values({
          clinicId: DEMO_CLINIC_ID,
          fullName: "Alex Host",
          specialty: "Community Host",
        })
        .returning();
      host = created;
    }
    const base = new Date();
    base.setDate(base.getDate() + 1);
    base.setHours(10, 0, 0, 0);
    await db.insert(appointments).values([
      {
        clinicId: DEMO_CLINIC_ID,
        patientId: demo.id,
        doctorId: host.id,
        title: "Welcome Meetup",
        type: "Meetup",
        startAt: base,
        endAt: new Date(base.getTime() + 60 * 60 * 1000),
        locationText: "Demo Community Hub",
        status: "SCHEDULED",
        notes: "Say hello to the group!",
      },
      {
        clinicId: DEMO_CLINIC_ID,
        patientId: demo.id,
        doctorId: host.id,
        title: "Photo Walk",
        type: "Event",
        startAt: new Date(base.getTime() + 2 * 24 * 60 * 60 * 1000),
        locationText: "City Center",
        status: "SCHEDULED",
      },
    ]);
    console.log("[ensure] Seeded demo community events");
  }

  console.log("\n[ensure] Production review-ready. Run: npm run smoke:review:prod");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
