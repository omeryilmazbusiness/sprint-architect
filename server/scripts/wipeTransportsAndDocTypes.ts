/**
 * DEV-ONLY: Wipe all transports and document_types data
 * ======================================================
 * Deletes all rows from: patient_documents, document_types, transports
 * Also nullifies transportId references in patient_plans (FK safety).
 *
 * GUARDS:
 *  1. Refuses to run if NODE_ENV === "test"
 *  2. Refuses to run if DATABASE_URL contains "test"
 *  3. Dry-run by default — set WIPE_CONFIRM=YES_WIPE_TRN_DOC to actually wipe
 *
 * Usage:
 *   DRY:  NODE_ENV=development tsx server/scripts/wipeTransportsAndDocTypes.ts
 *   REAL: WIPE_CONFIRM=YES_WIPE_TRN_DOC NODE_ENV=development tsx server/scripts/wipeTransportsAndDocTypes.ts
 */

import { db } from "../db";
import { transports, documentTypes, patientDocuments, patientPlans } from "@shared/schema";
import { count, isNotNull } from "drizzle-orm";

async function run() {
  if (process.env.NODE_ENV === "test") {
    console.error("❌ Refusing to run in NODE_ENV=test");
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL ?? "";
  if (dbUrl.toLowerCase().includes("test")) {
    console.error("❌ Refusing to run: DATABASE_URL appears to be a test database");
    process.exit(1);
  }

  const isDryRun = process.env.WIPE_CONFIRM !== "YES_WIPE_TRN_DOC";

  console.log(`\n🔍 Wipe Mode: ${isDryRun ? "DRY RUN (no changes)" : "⚡ REAL WIPE"}`);

  const [patDocBefore] = await db.select({ cnt: count() }).from(patientDocuments);
  const [docTypeBefore] = await db.select({ cnt: count() }).from(documentTypes);
  const [transBefore] = await db.select({ cnt: count() }).from(transports);

  console.log("\n📊 Before counts:");
  console.log(`  patient_documents : ${patDocBefore.cnt}`);
  console.log(`  document_types    : ${docTypeBefore.cnt}`);
  console.log(`  transports        : ${transBefore.cnt}`);

  if (isDryRun) {
    console.log("\n⚠️  DRY RUN — no data was changed.");
    console.log("   To actually wipe, run:");
    console.log("   WIPE_CONFIRM=YES_WIPE_TRN_DOC NODE_ENV=development tsx server/scripts/wipeTransportsAndDocTypes.ts\n");
    process.exit(0);
  }

  console.log("\n⚡ Wiping data...");

  // Step 1: delete patient_documents (FK to document_types)
  const deletedPatDocs = await db.delete(patientDocuments).returning({ id: patientDocuments.id });
  console.log(`  ✅ Deleted ${deletedPatDocs.length} patient_documents`);

  // Step 2: delete document_types
  const deletedDocTypes = await db.delete(documentTypes).returning({ id: documentTypes.id });
  console.log(`  ✅ Deleted ${deletedDocTypes.length} document_types`);

  // Step 3: nullify transport FK in patient_plans before deleting transports
  await db
    .update(patientPlans)
    .set({ transportId: null as any })
    .where(isNotNull(patientPlans.transportId));
  console.log(`  ✅ Nullified transportId on patient_plans`);

  // Step 4: delete transports
  const deletedTransports = await db.delete(transports).returning({ id: transports.id });
  console.log(`  ✅ Deleted ${deletedTransports.length} transports`);

  const [patDocAfter] = await db.select({ cnt: count() }).from(patientDocuments);
  const [docTypeAfter] = await db.select({ cnt: count() }).from(documentTypes);
  const [transAfter] = await db.select({ cnt: count() }).from(transports);

  console.log("\n📊 After counts:");
  console.log(`  patient_documents : ${patDocAfter.cnt}`);
  console.log(`  document_types    : ${docTypeAfter.cnt}`);
  console.log(`  transports        : ${transAfter.cnt}`);

  console.log("\n✅ Done!\n");
  process.exit(0);
}

run().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
