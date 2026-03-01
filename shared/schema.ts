import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  pgEnum,
  boolean,
  integer,
  doublePrecision,
  uniqueIndex,
} from "drizzle-orm/pg-core";
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

export const patientStatusEnum = pgEnum("patient_status", [
  "ACTIVE",
  "INACTIVE",
  "PENDING",
]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "SCHEDULED",
  "DONE",
  "CANCELLED",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "ASSIGNED",
  "UPLOADED",
  "APPROVED",
  "REJECTED",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "PENDING",
  "UNPAID",
  "PAID",
]);

export const clinics = pgTable("clinics", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  services: text("services").default("[]"),
  status: clinicStatusEnum("status").notNull().default("ACTIVE"),
  statusReason: text("status_reason"),
  billingUnitPrice: doublePrecision("billing_unit_price"),
  currency: text("currency").notNull().default("EUR"),
  billingAnchorDay: integer("billing_anchor_day").notNull().default(1),
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
  statusReason: text("status_reason"),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const patients = pgTable("patients", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clinicId: varchar("clinic_id")
    .notNull()
    .references(() => clinics.id),
  fullName: text("full_name").notNull(),
  patientKey: text("patient_key").notNull().unique(),
  phone: text("phone"),
  email: text("email"),
  nationality: text("nationality"),
  passportNo: text("passport_no"),
  arrivalDate: text("arrival_date"),
  departureDate: text("departure_date"),
  status: patientStatusEnum("status").notNull().default("PENDING"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const doctors = pgTable("doctors", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clinicId: varchar("clinic_id")
    .notNull()
    .references(() => clinics.id),
  fullName: text("full_name").notNull(),
  specialty: text("specialty"),
  phone: text("phone"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const hotels = pgTable("hotels", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clinicId: varchar("clinic_id")
    .notNull()
    .references(() => clinics.id),
  name: text("name").notNull(),
  address: text("address"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  stars: integer("stars"),
  phone: text("phone"),
  website: text("website"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transports = pgTable("transports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clinicId: varchar("clinic_id")
    .notNull()
    .references(() => clinics.id),
  driverName: text("driver_name"),
  driverPhone: text("driver_phone").notNull(),
  vehicleInfo: text("vehicle_info"),
  meetingPointText: text("meeting_point_text"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const patientPlans = pgTable("patient_plans", {
  patientId: varchar("patient_id")
    .primaryKey()
    .references(() => patients.id),
  clinicId: varchar("clinic_id")
    .notNull()
    .references(() => clinics.id),
  hotelId: varchar("hotel_id").references(() => hotels.id),
  transportId: varchar("transport_id").references(() => transports.id),
  doctorId: varchar("doctor_id").references(() => doctors.id),
  hotelStayDays: integer("hotel_stay_days"),
  roomNo: text("room_no"),
  checkInDate: text("check_in_date"),
  checkOutDate: text("check_out_date"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clinicId: varchar("clinic_id")
    .notNull()
    .references(() => clinics.id),
  patientId: varchar("patient_id")
    .notNull()
    .references(() => patients.id),
  doctorId: varchar("doctor_id").references(() => doctors.id),
  title: text("title").notNull(),
  type: text("type"),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at"),
  locationText: text("location_text"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  notes: text("notes"),
  status: appointmentStatusEnum("status").notNull().default("SCHEDULED"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const documentTypes = pgTable("document_types", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clinicId: varchar("clinic_id")
    .notNull()
    .references(() => clinics.id),
  name: text("name").notNull(),
  description: text("description"),
  isRequired: boolean("is_required").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const patientDocuments = pgTable("patient_documents", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clinicId: varchar("clinic_id")
    .notNull()
    .references(() => clinics.id),
  patientId: varchar("patient_id")
    .notNull()
    .references(() => patients.id),
  documentTypeId: varchar("document_type_id")
    .notNull()
    .references(() => documentTypes.id),
  status: documentStatusEnum("status").notNull().default("ASSIGNED"),
  fileUrl: text("file_url"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  patientId: varchar("patient_id").references(() => patients.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const devices = pgTable("devices", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id")
    .notNull()
    .references(() => patients.id),
  deviceId: text("device_id").notNull(),
  boundAt: timestamp("bound_at").notNull().defaultNow(),
  revokedAt: timestamp("revoked_at"),
});

export const invoices = pgTable("invoices", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clinicId: varchar("clinic_id")
    .notNull()
    .references(() => clinics.id),
  period: text("period").notNull(),
  patientCount: integer("patient_count").notNull().default(0),
  unitPrice: doublePrecision("unit_price").notNull().default(0),
  currency: text("currency").notNull().default("EUR"),
  total: doublePrecision("total").notNull().default(0),
  status: invoiceStatusEnum("status").notNull().default("PENDING"),
  issuedAt: timestamp("issued_at"),
  dueAt: timestamp("due_at"),
  paidAt: timestamp("paid_at"),
  paidByUserId: varchar("paid_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clinicId: varchar("clinic_id"),
  actorId: text("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  metadata: text("metadata"),
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
export type Patient = typeof patients.$inferSelect;
export type Doctor = typeof doctors.$inferSelect;
export type Hotel = typeof hotels.$inferSelect;
export type Transport = typeof transports.$inferSelect;
export type PatientPlan = typeof patientPlans.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type DocumentType = typeof documentTypes.$inferSelect;
export type PatientDocument = typeof patientDocuments.$inferSelect;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

export const patientsRelations = relations(patients, ({ one, many }) => ({
  plan: one(patientPlans, { fields: [patients.id], references: [patientPlans.patientId] }),
  appointments: many(appointments),
  documents: many(patientDocuments),
  devices: many(devices),
}));

export const patientPlansRelations = relations(patientPlans, ({ one }) => ({
  patient: one(patients, { fields: [patientPlans.patientId], references: [patients.id] }),
  hotel: one(hotels, { fields: [patientPlans.hotelId], references: [hotels.id] }),
  transport: one(transports, { fields: [patientPlans.transportId], references: [transports.id] }),
  doctor: one(doctors, { fields: [patientPlans.doctorId], references: [doctors.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, { fields: [appointments.patientId], references: [patients.id] }),
  doctor: one(doctors, { fields: [appointments.doctorId], references: [doctors.id] }),
}));

export const patientDocumentsRelations = relations(patientDocuments, ({ one }) => ({
  patient: one(patients, { fields: [patientDocuments.patientId], references: [patients.id] }),
  documentType: one(documentTypes, { fields: [patientDocuments.documentTypeId], references: [documentTypes.id] }),
}));

export const doctorsRelations = relations(doctors, ({ many }) => ({
  appointments: many(appointments),
}));

export const hotelsRelations = relations(hotels, ({ many }) => ({
  plans: many(patientPlans),
}));

export const transportsRelations = relations(transports, ({ many }) => ({
  plans: many(patientPlans),
}));

export const documentTypesRelations = relations(documentTypes, ({ many }) => ({
  patientDocuments: many(patientDocuments),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
  patient: one(patients, { fields: [refreshTokens.patientId], references: [patients.id] }),
}));

export const devicesRelations = relations(devices, ({ one }) => ({
  patient: one(patients, { fields: [devices.patientId], references: [patients.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  clinic: one(clinics, { fields: [invoices.clinicId], references: [clinics.id] }),
  paidBy: one(users, { fields: [invoices.paidByUserId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  clinic: one(clinics, { fields: [users.clinicId], references: [clinics.id] }),
}));
