/**
 * One-shot: ensure demo institution + staff logins work on production (TestFlight / App Review).
 * Usage:
 *   DATABASE_URL=<prod> NODE_ENV=development npx tsx server/scripts/activateDemoClinicProd.ts
 */
import { db } from "../db";
import { clinics, users, invoices } from "@shared/schema";
import { eq } from "drizzle-orm";

const CLINIC_ID = "clinic-demo-001";

async function main() {
  await db
    .update(clinics)
    .set({ status: "ACTIVE", statusReason: null })
    .where(eq(clinics.id, CLINIC_ID));

  for (const email of ["manager@demo.com", "admin@demo.com"]) {
    await db.update(users).set({ status: "ACTIVE" }).where(eq(users.email, email));
  }

  const invs = await db.select().from(invoices).where(eq(invoices.clinicId, CLINIC_ID));
  let paid = 0;
  for (const inv of invs) {
    if (inv.status !== "PAID") {
      await db
        .update(invoices)
        .set({ status: "PAID", paidAt: new Date() })
        .where(eq(invoices.id, inv.id));
      paid++;
    }
  }

  const clinic = await db.query.clinics.findFirst({ where: eq(clinics.id, CLINIC_ID) });
  const manager = await db.query.users.findFirst({ where: eq(users.email, "manager@demo.com") });
  console.log("[activateDemoClinicProd] clinic:", clinic?.status, clinic?.name);
  console.log("[activateDemoClinicProd] manager:", manager?.email, manager?.status);
  console.log("[activateDemoClinicProd] invoices marked PAID:", paid);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
