import { db } from "../../db";
import { patients, patientDocuments, appointments } from "@shared/schema";
import { eq, and, asc } from "drizzle-orm";

export interface GuestDetailDTO {
  patient: {
    id: string;
    clinicId: string;
    fullName: string;
    status: string;
    patientKey: string;
    phoneE164: string | null;
    email: string | null;
    nationality: string | null;
    nationalityCode: string | null;
    passportNo: string | null;
    dateOfBirth: string | null;
    arrivalDate: string | null;
    departureDate: string | null;
    notes: string | null;
    requestedServices: string[];
    companionRelation: string | null;
    emergencyContactName: string | null;
    emergencyContactPhoneE164: string | null;
  };
  tracking: { currentStep: string | null };
  assignments: {
    transport: {
      id: string;
      vehicleBrand: string | null;
      vehicleModel: string | null;
      licensePlate: string | null;
      driverFullName: string | null;
      driverPhoneE164: string | null;
    } | null;
    hotel: {
      id: string;
      name: string;
      address: string | null;
      phone: string | null;
      website: string | null;
    } | null;
  };
  documents: {
    assigned: Array<{
      id: string;
      typeId: string;
      typeName: string;
      instructionText: string | null;
      status: string;
    }>;
    summary: { pending: number; uploaded: number };
  };
  nextAppointment: {
    id: string;
    title: string | null;
    startAt: string;
    doctor: { fullName: string } | null;
  } | null;
}

function parseRequestedServices(
  raw: string | null | undefined,
  fallback: string | null | undefined
): string[] {
  try {
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  if (fallback) return [fallback];
  return [];
}

export async function fetchGuestDetail(
  clinicId: string,
  patientId: string
): Promise<GuestDetailDTO | null> {
  const patient = await db.query.patients.findFirst({
    where: and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)),
    with: {
      plan: {
        with: {
          hotel: true,
          transport: true,
        },
      },
    },
  });

  if (!patient) return null;

  const docs = await db.query.patientDocuments.findMany({
    where: and(
      eq(patientDocuments.patientId, patientId),
      eq(patientDocuments.clinicId, clinicId)
    ),
    with: { documentType: true },
    orderBy: [asc(patientDocuments.createdAt)],
  });

  const appts = await db.query.appointments.findMany({
    where: and(
      eq(appointments.patientId, patientId),
      eq(appointments.clinicId, clinicId)
    ),
    with: { doctor: true },
    orderBy: [asc(appointments.startAt)],
  });

  const now = new Date();
  const nextAppt =
    appts.find(
      (a) => new Date(a.startAt) >= now && a.status === "SCHEDULED"
    ) || null;

  const assigned = (docs ?? []).map((d) => ({
    id: d.id,
    typeId: d.documentTypeId,
    typeName: d.documentType?.name ?? "Document",
    instructionText: d.instructionText ?? null,
    status: d.status,
  }));

  const pending = assigned.filter((d) => d.status === "ASSIGNED").length;
  const uploaded = assigned.filter((d) =>
    ["UPLOADED", "APPROVED"].includes(d.status)
  ).length;

  return {
    patient: {
      id: patient.id,
      clinicId: patient.clinicId,
      fullName: patient.fullName,
      status: patient.status,
      patientKey: patient.patientKey,
      phoneE164: patient.phoneE164 ?? null,
      email: patient.email ?? null,
      nationality: patient.nationality ?? null,
      nationalityCode: patient.nationalityCode ?? null,
      passportNo: patient.passportNo ?? null,
      dateOfBirth: patient.dateOfBirth ?? null,
      arrivalDate: patient.arrivalDate ?? null,
      departureDate: patient.departureDate ?? null,
      notes: patient.notes ?? null,
      requestedServices: parseRequestedServices(
        patient.requestedServices,
        patient.requestedService
      ),
      companionRelation: patient.companionRelation ?? null,
      emergencyContactName: patient.emergencyContactName ?? null,
      emergencyContactPhoneE164: patient.emergencyContactPhoneE164 ?? null,
    },
    tracking: {
      currentStep: patient.plan?.currentStep ?? null,
    },
    assignments: {
      transport: patient.plan?.transport
        ? {
            id: patient.plan.transport.id,
            vehicleBrand: patient.plan.transport.vehicleBrand ?? null,
            vehicleModel: patient.plan.transport.vehicleModel ?? null,
            licensePlate: patient.plan.transport.vehiclePlate ?? null,
            driverFullName: patient.plan.transport.driverName ?? null,
            driverPhoneE164: patient.plan.transport.driverPhone ?? null,
          }
        : null,
      hotel: patient.plan?.hotel
        ? {
            id: patient.plan.hotel.id,
            name: patient.plan.hotel.name,
            address: patient.plan.hotel.address ?? null,
            phone: patient.plan.hotel.phone ?? null,
            website: patient.plan.hotel.website ?? null,
          }
        : null,
    },
    documents: {
      assigned,
      summary: { pending, uploaded },
    },
    nextAppointment: nextAppt
      ? {
          id: nextAppt.id,
          title: nextAppt.title ?? null,
          startAt: (
            nextAppt.startAt instanceof Date
              ? nextAppt.startAt
              : new Date(nextAppt.startAt)
          ).toISOString(),
          doctor: nextAppt.doctor
            ? { fullName: nextAppt.doctor.fullName }
            : null,
        }
      : null,
  };
}
