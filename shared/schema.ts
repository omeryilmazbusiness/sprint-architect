import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const clinicStatusEnum = pgEnum("clinic_status", [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
]);

export const userRoleEnum = pgEnum("user_role", [
  "ADMIN",
  "MANAGER",
  "PATIENT",
]);

export const userStatusEnum = pgEnum("user_status", [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
]);

export const clinics = pgTable("clinics", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  status: clinicStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("MANAGER"),
  clinicId: varchar("clinic_id").references(() => clinics.id),
  status: userStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertClinicSchema = createInsertSchema(clinics).pick({
  name: true,
  status: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  passwordHash: true,
  role: true,
  clinicId: true,
});

export type InsertClinic = z.infer<typeof insertClinicSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Clinic = typeof clinics.$inferSelect;
export type User = typeof users.$inferSelect;
