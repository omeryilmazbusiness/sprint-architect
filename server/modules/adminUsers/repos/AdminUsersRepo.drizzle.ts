import { db } from "../../../db";
import { users, patients, clinics } from "@shared/schema";
import { eq, inArray, isNotNull } from "drizzle-orm";

export const adminUsersRepo = {
  async getPrimaryManagerUserIds(): Promise<Set<string>> {
    const rows = await db
      .select({ primaryManagerUserId: clinics.primaryManagerUserId })
      .from(clinics)
      .where(isNotNull(clinics.primaryManagerUserId));

    return new Set(
      rows
        .map((r) => r.primaryManagerUserId)
        .filter((id): id is string => id !== null),
    );
  },

  async getUsersByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return db.query.users.findMany({
      where: inArray(users.id, ids),
    });
  },

  async getPatientsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return db.query.patients.findMany({
      where: inArray(patients.id, ids),
    });
  },

  async deactivateUsers(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db
      .update(users)
      .set({ status: "INACTIVE", statusReason: "ADMIN_DEACTIVATED" })
      .where(inArray(users.id, ids))
      .returning({ id: users.id });
    return result.length;
  },

  async deactivatePatients(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db
      .update(patients)
      .set({ status: "INACTIVE", statusReason: "ADMIN_DEACTIVATED" })
      .where(inArray(patients.id, ids))
      .returning({ id: patients.id });
    return result.length;
  },
};
