/**
 * One-time: rename demo clinic for App Store review (prod DB).
 * Run: ALLOW_PROD_DEMO_SEED=1 bun run server/scripts/renameDemoCommunityProd.ts
 */
import { db } from "../db";
import { clinics } from "@shared/schema";
import { eq } from "drizzle-orm";

const DEMO_CLINIC_ID = "clinic-demo-001";
const NEW_NAME = "Demo Community";

async function main() {
  if (process.env.ALLOW_PROD_DEMO_SEED !== "1") {
    console.error("Set ALLOW_PROD_DEMO_SEED=1 to run on production.");
    process.exit(1);
  }

  const [row] = await db
    .update(clinics)
    .set({ name: NEW_NAME, updatedAt: new Date() })
    .where(eq(clinics.id, DEMO_CLINIC_ID))
    .returning({ id: clinics.id, name: clinics.name });

  if (!row) {
    console.log(`[renameDemoCommunity] No clinic with id ${DEMO_CLINIC_ID}`);
    process.exit(1);
  }

  console.log(`[renameDemoCommunity] Updated: ${row.id} → "${row.name}"`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
