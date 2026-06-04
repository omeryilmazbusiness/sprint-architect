/**
 * Remove sensitive document types from demo community; seed neutral upload types.
 *
 *   ALLOW_PROD_DEMO_SEED=1 DATABASE_URL=<prod> npx tsx server/scripts/sanitizeCommunityUploadTypesProd.ts
 */
import { db } from "../db";
import { clinics, documentTypes, patientDocuments } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import {
  COMMUNITY_UPLOAD_TYPE_PRESETS,
  isSensitiveDocumentType,
} from "@shared/communityUploadTypes";

const DEMO_CLINIC_ID = "clinic-demo-001";

async function main() {
  if (process.env.ALLOW_PROD_DEMO_SEED !== "1") {
    console.error("[sanitize] Set ALLOW_PROD_DEMO_SEED=1 to run on production.");
    process.exit(1);
  }

  const clinic = await db.query.clinics.findFirst({
    where: eq(clinics.id, DEMO_CLINIC_ID),
  });
  if (!clinic) {
    console.error("[sanitize] Demo clinic not found.");
    process.exit(1);
  }

  const rows = await db.query.documentTypes.findMany({
    where: eq(documentTypes.clinicId, DEMO_CLINIC_ID),
  });

  const sensitiveIds = rows
    .filter((r) => isSensitiveDocumentType(r.name, r.code))
    .map((r) => r.id);

  if (sensitiveIds.length > 0) {
    await db
      .delete(patientDocuments)
      .where(inArray(patientDocuments.documentTypeId, sensitiveIds));
    await db.delete(documentTypes).where(inArray(documentTypes.id, sensitiveIds));
    console.log(`[sanitize] Removed ${sensitiveIds.length} sensitive document type(s).`);
  }

  for (const preset of COMMUNITY_UPLOAD_TYPE_PRESETS) {
    const exists = rows.find(
      (r) => r.code === preset.code || r.name.toLowerCase() === preset.name.toLowerCase(),
    );
    if (!exists) {
      await db.insert(documentTypes).values({
        clinicId: DEMO_CLINIC_ID,
        name: preset.name,
        code: preset.code,
        isRequired: preset.isRequired,
      });
      console.log(`[sanitize] Added: ${preset.name}`);
    }
  }

  await db
    .update(clinics)
    .set({ name: "Demo Community" })
    .where(eq(clinics.id, DEMO_CLINIC_ID));

  console.log("[sanitize] Done. Run: npm run db:seed:demo-guest");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
