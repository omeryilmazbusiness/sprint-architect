/**
 * Backfill scheduledPurgeAt for guests with departureDate but no schedule.
 * Run: npx tsx scripts/backfill-guest-retention-schedule.ts
 */
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "../server/db";
import { patients } from "@shared/schema";
import { departureRetentionFields } from "../server/modules/guestRetention";

async function main() {
  const rows = await db.query.patients.findMany({
    where: and(isNotNull(patients.departureDate), isNull(patients.scheduledPurgeAt)),
    columns: { id: true, departureDate: true },
  });

  let updated = 0;
  for (const row of rows) {
    if (!row.departureDate) continue;
    const fields = departureRetentionFields(row.departureDate);
    await db.update(patients).set(fields).where(eq(patients.id, row.id));
    updated++;
  }

  console.log(`[backfill] Updated ${updated} guest retention schedule(s).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
