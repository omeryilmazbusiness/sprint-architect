import { Router } from "express";
import { authMiddleware, requireRole } from "../auth/middleware";
import { AppError } from "../auth/errors";
import { patientRepo } from "../repositories/patientRepo";
import { planRepo } from "../repositories/planRepo";
import { appointmentRepo } from "../repositories/appointmentRepo";
import { documentRepo } from "../repositories/documentRepo";
import { doctorRepo } from "../repositories/doctorRepo";
import { db } from "../db";
import { clinics, users } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/notifications/unread-count", authMiddleware, requireRole("PATIENT"), async (_req, res) => {
  res.json({ unread: 0 });
});

router.get("/dashboard", authMiddleware, requireRole("PATIENT"), async (req, res, next) => {
  try {
    const actor = req.actor;
    if (!actor || actor.type !== "patient") {
      throw new AppError("AUTH_FORBIDDEN", "Patient access only", 403);
    }

    const patientId = actor.sub;
    const clinicId = actor.clinicId!;

    const patient = await patientRepo.findById(patientId, clinicId);
    if (!patient) {
      throw new AppError("NOT_FOUND", "Patient record not found", 404);
    }

    const [plan, appts, patientDocs, clinic] = await Promise.all([
      planRepo.findByPatient(patientId),
      appointmentRepo.listForPatient(patientId, clinicId),
      documentRepo.listPatientDocuments(patientId, clinicId),
      db.query.clinics.findFirst({ where: eq(clinics.id, clinicId) }),
    ]);

    let manager: { fullName: string | null; phone: string | null; email: string | null } | null = null;
    if (clinic?.primaryManagerUserId) {
      const managerUser = await db.query.users.findFirst({
        where: eq(users.id, clinic.primaryManagerUserId),
      });
      if (managerUser) {
        manager = {
          fullName: managerUser.fullName ?? null,
          phone: managerUser.phoneE164 ?? null,
          email: managerUser.email,
        };
      }
    }

    const doctorIdSet = new Set<string>();
    appts.filter(a => a.doctorId).forEach(a => doctorIdSet.add(a.doctorId as string));
    if (plan?.doctorId) doctorIdSet.add(plan.doctorId);

    let uniqueDoctors: any[] = [];
    if (doctorIdSet.size > 0) {
      const allDoctors = await doctorRepo.list(clinicId);
      uniqueDoctors = allDoctors.rows.filter(d => doctorIdSet.has(d.id));
    }

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
        clinicName: clinic?.name ?? null,
        clinicAddress: clinic?.address ?? null,
        clinicSupportPhone: clinic?.contactPhone ?? null,
        clinicSupportEmail: clinic?.contactEmail ?? null,
        clinicWebsite: clinic?.websiteUrl ?? null,
        manager,
      },
      tracking: {
        currentStep: plan?.currentStep ?? null,
      },
      transport: plan?.transport
        ? {
            id: plan.transport.id,
            driverName: plan.transport.driverName,
            driverPhone: plan.transport.driverPhone,
            vehicleInfo: plan.transport.vehicleInfo,
            vehicleBrand: plan.transport.vehicleBrand,
            vehicleModel: plan.transport.vehicleModel,
            vehiclePlate: plan.transport.vehiclePlate,
            meetingPointText: plan.transport.meetingPointText,
            latitude: plan.transport.latitude,
            longitude: plan.transport.longitude,
          }
        : null,
      hotel: plan?.hotel
        ? {
            id: plan.hotel.id,
            name: plan.hotel.name,
            address: plan.hotel.address,
            latitude: plan.hotel.latitude,
            longitude: plan.hotel.longitude,
            stayDays: plan.hotelStayDays,
            roomNo: plan.roomNo,
            checkInDate: plan.checkInDate,
            checkOutDate: plan.checkOutDate,
          }
        : null,
      appointments: appts.map(a => ({
        id: a.id,
        title: a.title,
        type: a.type,
        startAt: a.startAt,
        endAt: a.endAt,
        locationText: a.locationText,
        status: a.status,
        notes: a.notes,
        doctor: a.doctor
          ? { id: a.doctor.id, fullName: a.doctor.fullName, specialty: a.doctor.specialty }
          : null,
      })),
      doctors: uniqueDoctors.map(d => ({
        id: d.id,
        fullName: d.fullName,
        specialty: d.specialty ?? null,
        phone: d.phone ?? null,
        email: d.email ?? null,
        photoUrl: d.photoUrl ?? null,
        university: d.university ?? null,
        experienceYears: d.experienceYears ?? null,
        languages: d.languages ?? null,
        diplomaUrl: d.diplomaUrl ?? null,
        bio: d.bio ?? null,
      })),
      documents: patientDocs.map(d => ({
        id: d.id,
        documentType: d.documentType
          ? { id: d.documentType.id, name: d.documentType.name, isRequired: d.documentType.isRequired }
          : null,
        status: d.status,
        fileUrl: d.fileUrl,
        instructionText: d.instructionText ?? null,
        rejectionReason: d.status === "REJECTED" ? (d.rejectionReason ?? null) : null,
      })),
    });
  } catch (e) {
    next(e);
  }
});

export default router;
