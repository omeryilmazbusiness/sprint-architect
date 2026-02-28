import { Router } from "express";
import { z } from "zod";
import { authMiddleware, requireRole, clinicScopeMiddleware } from "../auth/middleware";
import { AppError } from "../auth/errors";
import { patientRepo } from "../repositories/patientRepo";
import { doctorRepo } from "../repositories/doctorRepo";
import { hotelRepo } from "../repositories/hotelRepo";
import { transportRepo } from "../repositories/transportRepo";
import { appointmentRepo } from "../repositories/appointmentRepo";
import { documentRepo } from "../repositories/documentRepo";
import { planRepo } from "../repositories/planRepo";

const router = Router();

router.use(authMiddleware, requireRole("MANAGER", "ADMIN"), clinicScopeMiddleware);

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
    res.status(201).json(patient);
  } catch (e) { next(e); }
});

router.get("/patients", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const { search, page, pageSize } = req.query as Record<string, string>;
    const result = await patientRepo.list(
      clinicId,
      search,
      page ? Number(page) : 1,
      pageSize ? Math.min(Number(pageSize), 100) : 20
    );
    res.json(result);
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

const assignDocumentsSchema = z.object({
  documentTypeIds: z.array(z.string()).min(1),
});

router.post("/patients/:id/assign-documents", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(assignDocumentsSchema, req.body);
    const patient = await patientRepo.findById(req.params.id, clinicId);
    if (!patient) notFound("Patient");
    const docs = await documentRepo.assignDocumentsToPatient(req.params.id, clinicId, body.documentTypeIds);
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
  driverPhone: z.string().min(1),
  driverName: z.string().optional(),
  vehicleInfo: z.string().optional(),
  meetingPointText: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

router.post("/transports", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const body = validateBody(createTransportSchema, req.body);
    const transport = await transportRepo.create({ clinicId, ...body });
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
    const transport = await transportRepo.update(req.params.id, clinicId, body);
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

router.get("/upcoming-appointments", async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const appts = await appointmentRepo.listUpcoming(clinicId);
    res.json(appts);
  } catch (e) { next(e); }
});

export default router;
