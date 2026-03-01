import { Router } from "express";
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

import { invoiceRepo } from "../repositories/invoiceRepo";
import { auditLog } from "./auditLogger";

const router = Router();

router.use(authMiddleware, requireRole("MANAGER", "ADMIN"), requireActiveClinic, clinicScopeMiddleware);

function getClinicId(req: any): string {
  return req.clinicId as string;
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

const createPatientSchema = z.object({
  fullName: z.string().min(1).max(200),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  nationality: z.string().optional(),
  passportNo: z.string().optional(),
  arrivalDate: z.string().optional(),
  departureDate: z.string().optional(),
  notes: z.string().optional(),
});

const updatePatientSchema = createPatientSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]).optional(),
});

router.post("/patients", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(createPatientSchema, req.body);
    const patient = await patientRepo.create({ clinicId, ...body });
    
    auditLog({
      clinicId,
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: "PATIENT_CREATED",
      resourceType: "patient",
      resourceId: patient.id,
    });

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

router.get("/patients/:id/details", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const { id } = req.params;

    const patient = await db.query.patients.findFirst({
      where: and(eq(patients.id, id), eq(patients.clinicId, clinicId)),
      with: {
        plan: {
          with: {
            doctor: true,
            hotel: true,
            transport: true,
          }
        }
      }
    });

    if (!patient) throw new AppError("NOT_FOUND", "Patient not found", 404);

    const documents = await db.query.patientDocuments.findMany({
      where: and(eq(patientDocuments.patientId, id), eq(patientDocuments.clinicId, clinicId)),
      with: { documentType: true },
      orderBy: [asc(patientDocuments.createdAt)],
    });

    const appts = await db.query.appointments.findMany({
      where: and(eq(appointments.patientId, id), eq(appointments.clinicId, clinicId)),
      with: { doctor: true },
      orderBy: [asc(appointments.startAt)],
    });

    // Compute requiredDocuments:
    const REQUIRED_CODES = ["PASSPORT_COPY", "VISA"];
    const REQUIRED_NAMES: Record<string, string> = {
      "PASSPORT_COPY": "Passport Photocopy",
      "VISA": "Visa",
    };

    const requiredDocuments = REQUIRED_CODES.map(code => {
      const found = documents.find(d => d.documentType?.code === code);
      return {
        code,
        name: REQUIRED_NAMES[code],
        status: found ? found.status : null,
        fileUrl: found ? found.fileUrl : null,
        documentId: found ? found.id : null,
      };
    });

    const now = new Date();
    const nextAppointment = appts.find(a => new Date(a.startAt) >= now && a.status === "SCHEDULED") || null;

    res.json({
      patient: {
        id: patient.id,
        fullName: patient.fullName,
        patientKey: patient.patientKey,
        phone: patient.phone,
        email: patient.email,
        nationality: patient.nationality,
        arrivalDate: patient.arrivalDate,
        departureDate: patient.departureDate,
        status: patient.status,
        notes: patient.notes,
      },
      plan: patient.plan ? {
        doctorId: patient.plan.doctorId,
        hotelId: patient.plan.hotelId,
        transportId: patient.plan.transportId,
        checkInDate: patient.plan.checkInDate,
        checkOutDate: patient.plan.checkOutDate,
        roomNo: patient.plan.roomNo,
        hotelStayDays: patient.plan.hotelStayDays,
        currentStep: patient.plan.currentStep,
      } : null,
      doctor: patient.plan?.doctor ? {
        id: patient.plan.doctor.id,
        fullName: patient.plan.doctor.fullName,
        specialty: patient.plan.doctor.specialty,
        phone: patient.plan.doctor.phone,
      } : null,
      hotel: patient.plan?.hotel ? {
        id: patient.plan.hotel.id,
        name: patient.plan.hotel.name,
      } : null,
      transport: patient.plan?.transport ? {
        id: patient.plan.transport.id,
        name: patient.plan.transport.vehicleInfo || patient.plan.transport.driverName || "Transport assigned",
      } : null,
      documents: documents.map(d => ({
        id: d.id,
        status: d.status,
        fileUrl: d.fileUrl,
        rejectionReason: d.rejectionReason,
        documentType: d.documentType ? {
          id: d.documentType.id,
          name: d.documentType.name,
          code: d.documentType.code,
          isRequired: d.documentType.isRequired,
        } : null,
      })),
      requiredDocuments,
      appointments: appts.map(a => ({
        id: a.id,
        title: a.title,
        type: a.type,
        startAt: a.startAt,
        endAt: a.endAt,
        status: a.status,
        locationText: a.locationText,
        notes: a.notes,
        doctor: a.doctor ? { id: a.doctor.id, fullName: a.doctor.fullName } : null,
      })),
      nextAppointment: nextAppointment ? {
        id: nextAppointment.id,
        title: nextAppointment.title,
        startAt: nextAppointment.startAt,
        status: nextAppointment.status,
        doctor: nextAppointment.doctor ? { fullName: nextAppointment.doctor.fullName } : null,
      } : null,
      tracking: {
        currentStep: patient.plan?.currentStep || null,
      }
    });
  } catch (err) {
    next(err);
  }
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

    if (body.hotelId) {
      const hotel = await hotelRepo.findById(body.hotelId, clinicId);
      if (!hotel) throw new AppError("NOT_FOUND", "Hotel not found or belongs to another clinic", 404);
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
    res.json(plan);
  } catch (e) { next(e); }
});

const assignDocumentsSchema = z.object({
  documentTypeCodes: z.array(z.string()).min(1),
});

router.post("/patients/:id/assign-documents", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(assignDocumentsSchema, req.body);
    const patient = await patientRepo.findById(req.params.id, clinicId);
    if (!patient) notFound("Patient");

    // Look up document type IDs by code within this clinic
    const docTypes = await db.query.documentTypes.findMany({
      where: and(
        eq(documentTypes.clinicId, clinicId),
        inArray(documentTypes.code, body.documentTypeCodes)
      ),
    });

    if (docTypes.length === 0) {
      throw new AppError("VALIDATION_ERROR", "No valid document types found for the provided codes", 400);
    }

    const docTypeIds = docTypes.map(dt => dt.id);
    const docs = await documentRepo.assignDocumentsToPatient(req.params.id, clinicId, docTypeIds);
    res.json(docs);
  } catch (e) { next(e); }
});

const createAppointmentSchema = z.object({
  title: z.string().min(1),
  type: z.string().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  doctorId: z.string().optional(),
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
    const appt = await appointmentRepo.create({
      clinicId,
      patientId: req.params.id,
      ...body,
      startAt: new Date(body.startAt),
      endAt: body.endAt ? new Date(body.endAt) : undefined,
    });
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
  doctorId: z.string().nullable().optional(),
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
    const appt = await appointmentRepo.update(req.params.appointmentId, clinicId, {
      ...body,
      startAt: body.startAt ? new Date(body.startAt) : undefined,
      endAt: body.endAt !== undefined ? (body.endAt ? new Date(body.endAt) : null) : undefined,
    });
    if (!appt) notFound("Appointment");
    res.json(appt);
  } catch (e) { next(e); }
});

router.delete("/appointments/:appointmentId", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const appt = await appointmentRepo.cancel(req.params.appointmentId, clinicId);
    if (!appt) notFound("Appointment");
    res.json({ success: true });
  } catch (e) { next(e); }
});

const createDoctorSchema = z.object({
  fullName: z.string().min(1).max(200),
  specialty: z.string().optional(),
  phone: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
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
    const hotels = await hotelRepo.list(clinicId);
    res.json(hotels);
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

const createTransportSchema = z.object({
  driverPhone: z.string().optional(),
  phone: z.string().optional(),
  driverName: z.string().optional(),
  vehicleType: z.string().optional(),
  licensePlate: z.string().optional(),
  vehicleInfo: z.string().optional(),
  meetingPointText: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

router.post("/transports", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(createTransportSchema, req.body);
    const { phone, driverPhone, vehicleType, licensePlate, vehicleInfo, ...rest } = body;
    const resolvedPhone = driverPhone || phone || "";
    const resolvedVehicleInfo = vehicleInfo || [vehicleType, licensePlate].filter(Boolean).join(" / ") || undefined;
    const transport = await transportRepo.create({ clinicId, driverPhone: resolvedPhone, vehicleInfo: resolvedVehicleInfo, ...rest });
    res.status(201).json(transport);
  } catch (e) { next(e); }
});

router.get("/transports", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const transports = await transportRepo.list(clinicId);
    res.json(transports);
  } catch (e) { next(e); }
});

router.get("/transports/:id", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const transport = await transportRepo.findById(req.params.id, clinicId);
    if (!transport) notFound("Transport");
    res.json(transport);
  } catch (e) { next(e); }
});

router.put("/transports/:id", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(createTransportSchema.partial(), req.body);
    const { phone, driverPhone, vehicleType, licensePlate, vehicleInfo, ...rest } = body;
    const update: Record<string, unknown> = { ...rest };
    if (driverPhone || phone) update.driverPhone = driverPhone || phone;
    if (vehicleInfo || vehicleType || licensePlate) {
      update.vehicleInfo = vehicleInfo || [vehicleType, licensePlate].filter(Boolean).join(" / ");
    }
    const transport = await transportRepo.update(req.params.id, clinicId, update as any);
    if (!transport) notFound("Transport");
    res.json(transport);
  } catch (e) { next(e); }
});

router.delete("/transports/:id", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const transport = await transportRepo.delete(req.params.id, clinicId);
    if (!transport) notFound("Transport");
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.get("/document-types", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const types = await documentRepo.listDocumentTypes(clinicId);
    res.json(types);
  } catch (e) { next(e); }
});

const createDocTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isRequired: z.boolean().optional(),
});

router.post("/document-types", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(createDocTypeSchema, req.body);
    const dt = await documentRepo.createDocumentType({ clinicId, ...body });
    res.status(201).json(dt);
  } catch (e) { next(e); }
});

router.delete("/document-types/:id", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const dt = await documentRepo.deleteDocumentType(req.params.id, clinicId);
    if (!dt) notFound("Document type");
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

export default router;
