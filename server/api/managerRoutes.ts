import { Router, type Request } from "express";
import { z } from "zod";
import { eq, and, gte, count, isNotNull, asc, inArray } from "drizzle-orm";
import { authMiddleware, requireRole, clinicScopeMiddleware, requireActiveClinic } from "../auth/middleware";
import { AppError } from "../auth/errors";
import { db } from "../db";
import { patients, appointments, patientDocuments, patientPlans, clinics, documentTypes } from "@shared/schema";
import { patientRepo } from "../repositories/patientRepo";
import { doctorRepo } from "../repositories/doctorRepo";
import { hotelRepo } from "../repositories/hotelRepo";
import { transportRepo } from "../repositories/transportRepo";
import { appointmentRepo } from "../repositories/appointmentRepo";
import { documentRepo } from "../repositories/documentRepo";
import { planRepo } from "../repositories/planRepo";
import { notificationRepo } from "../repositories/notificationRepo";
import { deviceTokenRepo } from "../repositories/deviceTokenRepo";
import { notificationService } from "../services/NotificationService";

import { invoiceRepo } from "../repositories/invoiceRepo";
import { billingEventsRepo } from "../modules/billingEvents/repos/BillingEventsRepo.drizzle";
import { auditLog } from "./auditLogger";

const router = Router();

router.use(authMiddleware, requireRole("MANAGER", "ADMIN"), requireActiveClinic, clinicScopeMiddleware);

function getClinicId(req: Request): string {
  if (!req.clinicId) throw new AppError("FORBIDDEN", "No clinic scope in request", 403);
  return req.clinicId;
}

function validateBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", result.error.issues.map(i => i.message).join("; "), 400);
  }
  return result.data;
}

function notFound(entity: string) {
  throw new AppError("NOT_FOUND", `${entity} not found`, 404);
}

const REQUESTED_SERVICES = [
  "Dental", "Eye Surgery", "Rhinoplasty", "Hair Transplant",
  "Plastic Surgery", "Orthopedic", "Cardiac", "IVF / Fertility",
  "Weight Loss Surgery", "Oncology", "Other",
] as const;

const createPatientSchema = z.object({
  fullName: z.string().min(1).max(200),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  nationality: z.string().min(1, "Nationality is required"),
  nationalityCode: z.string().max(2).min(2, "Nationality code required"),
  passportNo: z.string().optional(),
  phoneE164: z.string().min(5, "Phone is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  emergencyContactName: z.string().optional(),
  emergencyContactPhoneE164: z.string().optional(),
  companionRelation: z.string().optional(),
  arrivalDate: z.string().min(1, "Arrival date is required"),
  departureDate: z.string().min(1, "Departure date is required"),
  arrivalAirport: z.string().optional(),
  flightNumber: z.string().optional(),
  requestedServices: z.array(z.enum(REQUESTED_SERVICES)).min(1, "Select at least one service"),
  notes: z.string().optional(),
  preferredLanguage: z.string().optional(),
}).refine(d => d.departureDate >= d.arrivalDate, {
  message: "Departure date must be on or after arrival date",
  path: ["departureDate"],
});

const updatePatientSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  nationality: z.string().optional(),
  nationalityCode: z.string().max(2).optional(),
  passportNo: z.string().optional(),
  phoneE164: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  emergencyContactName: z.string().optional(),
  emergencyContactPhoneE164: z.string().optional(),
  companionRelation: z.string().optional(),
  arrivalDate: z.string().optional(),
  departureDate: z.string().optional(),
  arrivalAirport: z.string().optional(),
  flightNumber: z.string().optional(),
  requestedServices: z.array(z.enum(REQUESTED_SERVICES)).optional(),
  requestedService: z.string().optional(),
  notes: z.string().optional(),
  preferredLanguage: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING", "APPROVED", "ENDED", "WAITING_APPROVAL"]).optional(),
});

router.post("/patients", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(createPatientSchema, req.body);
    const patient = await patientRepo.create({ clinicId, ...body });

    const now = new Date();
    const billingPeriod = patient.arrivalDate
      ? patient.arrivalDate.slice(0, 7)
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    await billingEventsRepo.upsert({ clinicId, patientId: patient.id, period: billingPeriod });

    auditLog({
      clinicId,
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: "PATIENT_CREATED",
      resourceType: "patient",
      resourceId: patient.id,
      metadata: { billingPeriod, status: "ACTIVE" },
    });

    notificationService.emitAdminNotification({
      type: "GUEST_CREATED",
      title: "New Guest Registered",
      body: `${patient.fullName} has been added to a clinic.`,
      severity: "INFO",
      relatedId: patient.id,
      relatedType: "patient",
      metadata: { clinicId, patientKey: patient.patientKey },
    }).catch(() => {});

    res.status(201).json(patient);
  } catch (e) { next(e); }
});

router.get("/patients", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const { search, page, pageSize, status, missing } = req.query as Record<string, string>;
    const result = await patientRepo.list(
      clinicId,
      search,
      page ? Number(page) : 1,
      pageSize ? Math.min(Number(pageSize), 100) : 20,
      status,
      missing
    );
    res.json(result);
  } catch (e) { next(e); }
});

router.get("/appointments", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const { from, to } = req.query as Record<string, string>;
    const appts = await appointmentRepo.listForClinic(clinicId, from, to);
    res.json(appts);
  } catch (e) { next(e); }
});

router.get("/patients/:id", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const patient = await patientRepo.findById(req.params.id, clinicId);
    if (!patient) notFound("Patient");
    const plan = await planRepo.findByPatient(req.params.id);
    res.json({ ...patient, plan: plan || null });
  } catch (e) { next(e); }
});

router.put("/patients/:id/tracking", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const { id } = req.params;
    const { currentStep } = req.body as { currentStep: string };

    const validSteps = ["PRE_ARRIVAL", "ARRIVAL_TRANSFER", "HOTEL_CHECKIN", "TREATMENT", "FOLLOWUP", "DEPARTURE"];
    if (currentStep && !validSteps.includes(currentStep)) {
      throw new AppError("VALIDATION_ERROR", "Invalid tracking step", 400);
    }

    const patient = await db.query.patients.findFirst({
      where: and(eq(patients.id, id), eq(patients.clinicId, clinicId)),
    });
    if (!patient) throw new AppError("NOT_FOUND", "Patient not found", 404);

    await db
      .update(patientPlans)
      .set({ currentStep, updatedAt: new Date() })
      .where(and(eq(patientPlans.patientId, id), eq(patientPlans.clinicId, clinicId)));

    const stepLabels: Record<string, string> = {
      PRE_ARRIVAL: "Pre-Arrival Preparation",
      ARRIVAL_TRANSFER: "Arrival & Transfer",
      HOTEL_CHECKIN: "Hotel Check-In",
      TREATMENT: "Treatment",
      FOLLOWUP: "Follow-Up",
      DEPARTURE: "Departure",
    };
    notificationService.emitGuestNotification(id, clinicId, {
      type: "JOURNEY_UPDATED",
      title: "Journey Updated",
      body: `Your current status has been updated to: ${stepLabels[currentStep] ?? currentStep}.`,
      severity: "INFO",
      relatedId: id,
      relatedType: "patient",
      metadata: { currentStep },
    }).catch(() => {});

    res.json({ currentStep });
  } catch (err) {
    next(err);
  }
});

router.put("/patients/:id", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(updatePatientSchema, req.body);
    const patient = await patientRepo.update(req.params.id, clinicId, body);
    if (!patient) notFound("Patient");
    res.json(patient);
  } catch (e) { next(e); }
});

router.put("/patients/:id/status", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const { id } = req.params;
    const { status } = validateBody(z.object({
      status: z.enum(["PENDING", "APPROVED", "ENDED", "WAITING_APPROVAL"]),
    }), req.body);

    const existing = await patientRepo.findById(id, clinicId);
    if (!existing) notFound("Patient");

    const patient = await patientRepo.update(id, clinicId, { status });

    const actionMap: Record<string, string> = {
      APPROVED: "GUEST_APPROVED",
      ENDED: "GUEST_ENDED",
      PENDING: "GUEST_STATUS_CHANGED",
    };
    auditLog({
      clinicId,
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: actionMap[status] ?? "GUEST_STATUS_CHANGED",
      resourceType: "patient",
      resourceId: id,
      metadata: { newStatus: status },
    });

    if (status === "APPROVED" || status === "ENDED") {
      notificationService.emitAdminNotification({
        type: status === "APPROVED" ? "GUEST_APPROVED" : "GUEST_STATUS_CHANGED",
        title: status === "APPROVED" ? "Guest Approved" : "Guest Status Changed",
        body: `${existing!.fullName} is now ${status.toLowerCase()}.`,
        severity: "INFO",
        relatedId: id,
        relatedType: "patient",
        metadata: { clinicId, newStatus: status },
      }).catch(() => {});
    }

    if (status === "APPROVED") {
      notificationService.emitGuestNotification(id, clinicId, {
        type: "WELCOME",
        title: "Welcome to Your Journey",
        body: "Your account is now active. Your care team is ready to assist you.",
        severity: "INFO",
        relatedId: id,
        relatedType: "patient",
        metadata: { clinicId },
      }).catch(() => {});
    }

    res.json(patient);
  } catch (e) { next(e); }
});

router.delete("/patients/:id", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const patient = await patientRepo.softDelete(req.params.id, clinicId);
    if (!patient) notFound("Patient");
    res.json({ success: true });
  } catch (e) { next(e); }
});

const assignHotelSchema = z.object({
  hotelId: z.string().nullable().optional(),
  stayDays: z.number().int().positive().optional().nullable(),
  roomNo: z.string().optional().nullable(),
  checkInDate: z.string().optional().nullable(),
  checkOutDate: z.string().optional().nullable(),
});

router.put("/patients/:id/assign-hotel", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(assignHotelSchema, req.body);
    const patient = await patientRepo.findById(req.params.id, clinicId);
    if (!patient) notFound("Patient");

    let assignedHotel: { name: string } | null = null;
    if (body.hotelId) {
      const hotel = await hotelRepo.findById(body.hotelId, clinicId);
      if (!hotel) throw new AppError("NOT_FOUND", "Hotel not found or belongs to another clinic", 404);
      assignedHotel = hotel;
    }

    const plan = await planRepo.upsert({
      patientId: req.params.id,
      clinicId,
      hotelId: body.hotelId ?? null,
      hotelStayDays: body.stayDays ?? null,
      roomNo: body.roomNo ?? null,
      checkInDate: body.checkInDate ?? null,
      checkOutDate: body.checkOutDate ?? null,
    });

    if (body.hotelId && assignedHotel) {
      const hotelName = assignedHotel.name ?? "your hotel";
      notificationService.emitGuestNotification(req.params.id, clinicId, {
        type: "HOTEL_ASSIGNED",
        title: "Hotel Assigned",
        body: `Your accommodation has been arranged at ${hotelName}${body.checkInDate ? ` — check-in ${body.checkInDate}` : ""}.`,
        severity: "INFO",
        relatedId: body.hotelId,
        relatedType: "hotel",
        metadata: { hotelId: body.hotelId, checkInDate: body.checkInDate ?? null },
      }).catch(() => {});
    }

    res.json(plan);
  } catch (e) { next(e); }
});

const assignTransportSchema = z.object({
  transportId: z.string().nullable().optional(),
});

router.put("/patients/:id/assign-transport", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(assignTransportSchema, req.body);
    const patient = await patientRepo.findById(req.params.id, clinicId);
    if (!patient) notFound("Patient");

    if (body.transportId) {
      const transport = await transportRepo.findById(body.transportId, clinicId);
      if (!transport) throw new AppError("NOT_FOUND", "Transport not found or belongs to another clinic", 404);
    }

    const plan = await planRepo.upsert({
      patientId: req.params.id,
      clinicId,
      transportId: body.transportId ?? null,
    });

    if (body.transportId) {
      const transport = await transportRepo.findById(body.transportId, clinicId);
      const driverInfo = transport?.driverName ? ` — driver: ${transport.driverName}` : "";
      notificationService.emitGuestNotification(req.params.id, clinicId, {
        type: "TRANSPORT_ASSIGNED",
        title: "Transport Arranged",
        body: `Your transport has been arranged${driverInfo}. Check the Track tab for details.`,
        severity: "INFO",
        relatedId: body.transportId,
        relatedType: "transport",
        metadata: { transportId: body.transportId },
      }).catch(() => {});
    }

    res.json(plan);
  } catch (e) { next(e); }
});

const assignDoctorSchema = z.object({
  doctorId: z.string().nullable().optional(),
});

router.put("/patients/:id/assign-doctor", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(assignDoctorSchema, req.body);
    const patient = await patientRepo.findById(req.params.id, clinicId);
    if (!patient) notFound("Patient");

    if (body.doctorId) {
      const doctor = await doctorRepo.findById(body.doctorId, clinicId);
      if (!doctor) throw new AppError("NOT_FOUND", "Doctor not found or belongs to another clinic", 404);
    }

    const plan = await planRepo.upsert({
      patientId: req.params.id,
      clinicId,
      doctorId: body.doctorId ?? null,
    });

    if (body.doctorId) {
      const assignedDoctor = await doctorRepo.findById(body.doctorId, clinicId);
      const doctorName = assignedDoctor?.fullName ?? "your doctor";
      const specialty = assignedDoctor?.specialty ? ` (${assignedDoctor.specialty})` : "";
      notificationService.emitGuestNotification(req.params.id, clinicId, {
        type: "DOCTOR_ASSIGNED",
        title: "Doctor Assigned",
        body: `${doctorName}${specialty} has been assigned to your care.`,
        severity: "INFO",
        relatedId: body.doctorId,
        relatedType: "doctor",
        metadata: { doctorId: body.doctorId },
      }).catch(() => {});
    }

    res.json(plan);
  } catch (e) { next(e); }
});

const assignDocumentsSchema = z.object({
  items: z.array(z.object({
    documentTypeId: z.string().min(1),
    instructionText: z.string().optional(),
  })).min(1),
});

router.post("/patients/:id/assign-documents", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(assignDocumentsSchema, req.body);
    const patient = await patientRepo.findById(req.params.id, clinicId);
    if (!patient) notFound("Patient");

    const results = [];
    for (const item of body.items) {
      // Validate docType belongs to clinic
      const docType = await db.query.documentTypes.findFirst({
        where: and(eq(documentTypes.id, item.documentTypeId), eq(documentTypes.clinicId, clinicId)),
      });
      if (!docType) continue;

      // Check if doc already exists
      const existing = await db.query.patientDocuments.findFirst({
        where: and(
          eq(patientDocuments.patientId, req.params.id),
          eq(patientDocuments.documentTypeId, item.documentTypeId),
          eq(patientDocuments.clinicId, clinicId),
        ),
      });

      if (existing) {
        // Update: reset to ASSIGNED with new instructions
        const [updated] = await db.update(patientDocuments)
          .set({ status: "ASSIGNED", instructionText: item.instructionText ?? null, updatedAt: new Date() })
          .where(eq(patientDocuments.id, existing.id))
          .returning();
        results.push(updated);
      } else {
        // Insert new
        const [inserted] = await db.insert(patientDocuments)
          .values({
            clinicId,
            patientId: req.params.id,
            documentTypeId: item.documentTypeId,
            status: "ASSIGNED",
            instructionText: item.instructionText ?? null,
          })
          .returning();
        results.push(inserted);
      }
    }

    // Notify guest for each newly assigned document
    for (const doc of results) {
      notificationService.emitGuestNotification(req.params.id, clinicId, {
        type: "DOCUMENT_ASSIGNED",
        title: "Document Requested",
        body: "Your clinic has requested a document. Please upload it as soon as possible.",
        severity: "INFO",
        relatedId: doc.id,
        relatedType: "patient_document",
        metadata: { documentId: doc.id, patientId: req.params.id },
      }).catch(() => {});
    }

    res.json(results);
  } catch (e) { next(e); }
});

const createAppointmentSchema = z.object({
  title: z.string().min(1),
  type: z.string().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  doctorId: z.string().min(1, "Doctor is required"),
  locationText: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
}).refine(d => !d.endAt || d.endAt >= d.startAt, { message: "endAt must be >= startAt" });

router.post("/patients/:id/appointments", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(createAppointmentSchema, req.body);
    const patient = await patientRepo.findById(req.params.id, clinicId);
    if (!patient) notFound("Patient");

    const doctor = await doctorRepo.findById(body.doctorId, clinicId);
    if (!doctor) throw new AppError("NOT_FOUND", "Doctor not found or belongs to another clinic", 404);

    const appt = await appointmentRepo.create({
      clinicId,
      patientId: req.params.id,
      ...body,
      startAt: new Date(body.startAt),
      endAt: body.endAt ? new Date(body.endAt) : undefined,
    });

    const apptDateStr = new Date(body.startAt).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

    notificationService.emitGuestNotification(req.params.id, clinicId, {
      type: "APPOINTMENT_CREATED",
      title: "New Appointment Scheduled",
      body: `Your appointment "${body.title}" is scheduled for ${apptDateStr}.`,
      severity: "INFO",
      relatedId: appt.id,
      relatedType: "appointment",
      metadata: { appointmentId: appt.id, startAt: body.startAt },
    }).catch(() => {});

    notificationService.emitManagerNotification(clinicId, {
      type: "APPOINTMENT_CREATED",
      title: "Appointment Scheduled",
      body: `${patient!.fullName} — "${body.title}" on ${apptDateStr}.`,
      severity: "INFO",
      relatedId: appt.id,
      relatedType: "appointment",
      metadata: { patientId: req.params.id, appointmentId: appt.id },
    }).catch(() => {});

    res.status(201).json(appt);
  } catch (e) { next(e); }
});

router.get("/patients/:id/appointments", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const { from, to } = req.query as Record<string, string>;
    const patient = await patientRepo.findById(req.params.id, clinicId);
    if (!patient) notFound("Patient");
    const appts = await appointmentRepo.listForPatient(req.params.id, clinicId, from, to);
    res.json(appts);
  } catch (e) { next(e); }
});

const updateAppointmentSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.string().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().nullable().optional(),
  doctorId: z.string().min(1, "Doctor is required"),
  locationText: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
  status: z.enum(["SCHEDULED", "DONE", "CANCELLED"]).optional(),
});

router.put("/appointments/:appointmentId", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(updateAppointmentSchema, req.body);

    if (body.doctorId) {
      const doctor = await doctorRepo.findById(body.doctorId, clinicId);
      if (!doctor) throw new AppError("NOT_FOUND", "Doctor not found or belongs to another clinic", 404);
    }

    const appt = await appointmentRepo.update(req.params.appointmentId, clinicId, {
      ...body,
      startAt: body.startAt ? new Date(body.startAt) : undefined,
      endAt: body.endAt !== undefined ? (body.endAt ? new Date(body.endAt) : null) : undefined,
    });
    if (!appt) notFound("Appointment");

    if (appt && appt.patientId) {
      const updatedDateStr = appt.startAt
        ? new Date(appt.startAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : "";

      notificationService.emitGuestNotification(appt.patientId, clinicId, {
        type: "APPOINTMENT_UPDATED",
        title: "Appointment Updated",
        body: `Your appointment "${appt.title}" has been updated${updatedDateStr ? ` — now on ${updatedDateStr}` : ""}.`,
        severity: "WARNING",
        relatedId: appt.id,
        relatedType: "appointment",
        metadata: { appointmentId: appt.id, startAt: appt.startAt },
      }).catch(() => {});
    }

    res.json(appt);
  } catch (e) { next(e); }
});

router.delete("/appointments/:appointmentId", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const appt = await appointmentRepo.cancel(req.params.appointmentId, clinicId);
    if (!appt) notFound("Appointment");

    if (appt && appt.patientId) {
      notificationService.emitGuestNotification(appt.patientId, clinicId, {
        type: "APPOINTMENT_CANCELLED",
        title: "Appointment Cancelled",
        body: `Your appointment "${appt.title}" has been cancelled. Please contact your clinic for details.`,
        severity: "WARNING",
        relatedId: appt.id,
        relatedType: "appointment",
        metadata: { appointmentId: appt.id },
      }).catch(() => {});

      notificationService.emitManagerNotification(clinicId, {
        type: "APPOINTMENT_CANCELLED",
        title: "Appointment Cancelled",
        body: `Appointment "${appt.title}" was cancelled.`,
        severity: "WARNING",
        relatedId: appt.id,
        relatedType: "appointment",
        metadata: { patientId: appt.patientId, appointmentId: appt.id },
      }).catch(() => {});
    }

    res.json({ success: true });
  } catch (e) { next(e); }
});

const createDoctorSchema = z.object({
  fullName: z.string().min(1).max(200),
  specialty: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  photoUrl: z.string().url().optional().or(z.literal("")),
  university: z.string().optional(),
  graduationYear: z.number().int().min(1950).max(2030).optional(),
  experienceYears: z.number().int().min(0).max(70).optional(),
  bio: z.string().optional(),
  languages: z.string().optional(),
  certifications: z.string().optional(),
  diplomaUrl: z.string().optional(),
});

router.post("/doctors", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(createDoctorSchema, req.body);
    const doctor = await doctorRepo.create({ clinicId, ...body });
    res.status(201).json(doctor);
  } catch (e) { next(e); }
});

router.get("/doctors", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const { search } = req.query as Record<string, string>;
    const result = await doctorRepo.list(clinicId, search);
    res.json(result);
  } catch (e) { next(e); }
});

router.get("/doctors/:id", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const doctor = await doctorRepo.findById(req.params.id, clinicId);
    if (!doctor) notFound("Doctor");
    res.json(doctor);
  } catch (e) { next(e); }
});

router.put("/doctors/:id", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(createDoctorSchema.partial(), req.body);
    const doctor = await doctorRepo.update(req.params.id, clinicId, body);
    if (!doctor) notFound("Doctor");
    res.json(doctor);
  } catch (e) { next(e); }
});

router.delete("/doctors/:id", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const doctor = await doctorRepo.delete(req.params.id, clinicId);
    if (!doctor) notFound("Doctor");
    res.json({ success: true });
  } catch (e) { next(e); }
});

const createHotelSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  stars: z.number().int().min(1).max(5).optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
});

router.post("/hotels", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(createHotelSchema, req.body);
    const hotel = await hotelRepo.create({ clinicId, ...body });
    res.status(201).json(hotel);
  } catch (e) { next(e); }
});

router.get("/hotels", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const rows = await hotelRepo.list(clinicId);
    res.json({ rows });
  } catch (e) { next(e); }
});

router.get("/hotels/:id", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const hotel = await hotelRepo.findById(req.params.id, clinicId);
    if (!hotel) notFound("Hotel");
    res.json(hotel);
  } catch (e) { next(e); }
});

router.put("/hotels/:id", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(createHotelSchema.partial(), req.body);
    const hotel = await hotelRepo.update(req.params.id, clinicId, body);
    if (!hotel) notFound("Hotel");
    res.json(hotel);
  } catch (e) { next(e); }
});

router.delete("/hotels/:id", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const hotel = await hotelRepo.delete(req.params.id, clinicId);
    if (!hotel) notFound("Hotel");
    res.json({ success: true });
  } catch (e) { next(e); }
});


router.get("/patients/:id/documents", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const patient = await patientRepo.findById(req.params.id, clinicId);
    if (!patient) notFound("Patient");
    const docs = await documentRepo.listPatientDocuments(req.params.id, clinicId);
    res.json(docs);
  } catch (e) { next(e); }
});

router.put("/documents/:id", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(
      z.object({ 
        status: z.enum(["ASSIGNED", "UPLOADED", "APPROVED", "REJECTED"]).optional(), 
        notes: z.string().optional(),
        rejectionReason: z.string().nullable().optional()
      }),
      req.body
    );
    const doc = await documentRepo.updateDocument(req.params.id, clinicId, body);
    if (!doc) notFound("Document");

    if (body.status === "APPROVED" || body.status === "REJECTED") {
      auditLog({
        clinicId,
        actorId: req.actor!.sub,
        actorRole: req.actor!.role,
        action: body.status === "APPROVED" ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED",
        resourceType: "patient_document",
        resourceId: doc.id,
        metadata: body.status === "REJECTED" ? { reason: (body as any).rejectionReason } : undefined,
      });

      notificationService.emitManagerNotification(clinicId, {
        type: body.status === "APPROVED" ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED",
        title: body.status === "APPROVED" ? "Document Approved" : "Document Rejected",
        body: body.status === "APPROVED"
          ? `A document has been approved and marked ready.`
          : `A document was rejected. Reason: ${(body as any).rejectionReason ?? "Not specified"}`,
        severity: body.status === "REJECTED" ? "WARNING" : "INFO",
        relatedId: doc!.id,
        relatedType: "patient_document",
        metadata: { clinicId, documentId: doc!.id },
      }).catch(() => {});

      if (doc!.patientId) {
        notificationService.emitGuestNotification(doc!.patientId, clinicId, {
          type: body.status === "APPROVED" ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED",
          title: body.status === "APPROVED" ? "Document Approved" : "Document Needs Attention",
          body: body.status === "APPROVED"
            ? "Your document has been reviewed and approved."
            : `Your document was rejected. Reason: ${(body as any).rejectionReason ?? "Please re-upload a clearer file."}`,
          severity: body.status === "REJECTED" ? "WARNING" : "INFO",
          relatedId: doc!.id,
          relatedType: "patient_document",
          metadata: { documentId: doc!.id },
        }).catch(() => {});
      }
    }

    res.json(doc);
  } catch (e) { next(e); }
});

router.get("/clinic-info", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const clinic = await db.query.clinics.findFirst({ where: eq(clinics.id, clinicId) });
    if (!clinic) throw new AppError("NOT_FOUND", "Clinic not found", 404);
    res.json({ id: clinic.id, name: clinic.name, status: clinic.status });
  } catch (e) { next(e); }
});

router.get("/metrics", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [[{ totalPatients }], [{ upcomingToday }], [{ pendingDocuments }]] = await Promise.all([
      db.select({ totalPatients: count() }).from(patients).where(
        and(eq(patients.clinicId, clinicId), eq(patients.status, "ACTIVE"))
      ),
      db.select({ upcomingToday: count() }).from(appointments).where(
        and(
          eq(appointments.clinicId, clinicId),
          eq(appointments.status, "SCHEDULED"),
          gte(appointments.startAt, todayStart),
        )
      ),
      db.select({ pendingDocuments: count() }).from(patientDocuments).where(
        and(
          eq(patientDocuments.clinicId, clinicId),
          eq(patientDocuments.status, "ASSIGNED")
        )
      ),
    ]);

    const [{ completePlans }] = await db
      .select({ completePlans: count() })
      .from(patientPlans)
      .where(
        and(
          eq(patientPlans.clinicId, clinicId),
          isNotNull(patientPlans.hotelId),
          isNotNull(patientPlans.transportId),
          isNotNull(patientPlans.doctorId),
        )
      );
    const missingAssignments = Math.max(0, totalPatients - completePlans);

    res.json({ totalPatients, upcomingToday, pendingDocuments, missingAssignments });
  } catch (e) { next(e); }
});

router.get("/upcoming-appointments", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const appts = await appointmentRepo.listUpcoming(clinicId);
    res.json(appts);
  } catch (e) { next(e); }
});

router.get("/invoices", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const { period, status } = req.query as Record<string, string>;
    const result = await invoiceRepo.list({ clinicId, period, status });
    res.json(result);
  } catch (e) { next(e); }
});

router.get("/invoices/:id", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const invoice = await invoiceRepo.findById(req.params.id, clinicId);
    if (!invoice) notFound("Invoice");
    res.json(invoice);
  } catch (e) { next(e); }
});

router.get("/notifications/unread-count", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const count = await notificationRepo.getUnreadCount(clinicId);
    res.json({ count });
  } catch (e) { next(e); }
});

router.get("/notifications", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const { status, limit } = req.query as Record<string, string>;
    const list = await notificationRepo.list(
      clinicId,
      status as "UNREAD" | "READ",
      limit ? Number(limit) : undefined
    );
    res.json(list);
  } catch (e) { next(e); }
});

router.put("/notifications/:id/read", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const notification = await notificationRepo.markRead(req.params.id, clinicId);
    if (!notification) notFound("Notification");
    res.json(notification);
  } catch (e) { next(e); }
});

router.put("/notifications/read-all", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    await notificationRepo.markAllRead(clinicId);
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.post("/device-token", async (req, res, next) => {
  try {
    const { token, platform } = validateBody(
      z.object({ token: z.string().min(1), platform: z.enum(["ios", "android", "web"]) }),
      req.body,
    );
    const clinicId = getClinicId(req);
    await deviceTokenRepo.upsert({
      userId: req.actor!.sub,
      role: req.actor!.role,
      clinicId,
      token,
      platform,
    });
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.delete("/device-token", async (req, res, next) => {
  try {
    const { token } = validateBody(z.object({ token: z.string().min(1) }), req.body);
    await deviceTokenRepo.delete(token);
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
