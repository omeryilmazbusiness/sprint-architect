/**
 * One-off: rename demo institution display name in DB (manager header shows clinic.name).
 * Run: npx tsx scripts/rename-demo-clinic.ts
 */
import { db } from "../server/db";
import { clinics } from "@shared/schema";
import { eq } from "drizzle-orm";

const DEMO_ID = "clinic-demo-001";

async function main() {
  const result = await db
    .update(clinics)
    .set({ name: "Demo Community" })
    .where(eq(clinics.id, DEMO_ID))
    .returning({ id: clinics.id, name: clinics.name });

  if (result.length === 0) {
    console.log(`No row with id ${DEMO_ID}; run seed first.`);
    process.exit(1);
  }
  console.log("Updated:", result[0]);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
