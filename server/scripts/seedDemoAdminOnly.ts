/**
 * DEMO ADMIN SEED — Idempotent
 * ============================
 * Creates a single SUPER_ADMIN account for demo/development login.
 * Running this script multiple times is safe — it will not create duplicates.
 *
 * Credentials:
 *   Email   : admin@demo.com
 *   Password: Admin123!
 *
 * Usage:
 *   NODE_ENV=development tsx server/scripts/seedDemoAdminOnly.ts
 */

import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../auth/password";

const DEMO_EMAIL = "admin@demo.com";
const DEMO_PASSWORD = "Admin123!";
const DEMO_ID = "user-admin-001";

(async () => {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, DEMO_EMAIL),
  });

  if (existing) {
    const needsUpdate =
      existing.role !== "SUPER_ADMIN" || existing.status !== "ACTIVE";

    if (needsUpdate) {
      await db
        .update(users)
        .set({ role: "SUPER_ADMIN", status: "ACTIVE" })
        .where(eq(users.email, DEMO_EMAIL));
      console.log(
        `[seedDemoAdmin] Updated existing user: role=SUPER_ADMIN, status=ACTIVE`,
      );
    } else {
      console.log(
        `[seedDemoAdmin] User already exists with correct role and status. Nothing to do.`,
      );
    }

    process.exit(0);
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  await db.insert(users).values({
    id: DEMO_ID,
    email: DEMO_EMAIL,
    passwordHash,
    fullName: "Demo Admin",
    role: "SUPER_ADMIN",
    clinicId: null,
    status: "ACTIVE",
    mustChangePassword: false,
  });

  console.log(`[seedDemoAdmin] Created SUPER_ADMIN: ${DEMO_EMAIL}`);
  console.log(`[seedDemoAdmin] Done. Login with admin@demo.com / Admin123!`);

  process.exit(0);
})();
