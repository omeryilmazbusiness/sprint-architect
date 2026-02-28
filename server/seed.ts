import { db } from "./db";
import {
  clinics,
  doctors,
  hotels,
  transports,
  documentTypes,
  patients,
  patientPlans,
  appointments,
  patientDocuments,
  users,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth/password";

const CLINIC_ID = "clinic-demo-001";

export async function seedDatabase() {
  console.log("[seed] Starting database seed...");

  await db.insert(clinics)
    .values({
      id: CLINIC_ID,
      name: "Demo Clinic",
      status: "ACTIVE",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
    })
    .onConflictDoNothing();

  // Seed Users
  const adminPasswordHash = await hashPassword("Admin123!");
  const managerPasswordHash = await hashPassword("Manager123!");

  await db.insert(users).values([
    {
      id: "user-admin-001",
      email: "admin@demo.com",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      clinicId: null,
      status: "ACTIVE",
    },
    {
      id: "user-manager-001",
      email: "manager@demo.com",
      passwordHash: managerPasswordHash,
      role: "MANAGER",
      clinicId: CLINIC_ID,
      status: "ACTIVE",
    }
  ]).onConflictDoNothing();
  console.log("[seed] Users seeded (admin, manager)");

  const [doc1, doc2, doc3] = await Promise.all([
    db.insert(doctors).values({
      clinicId: CLINIC_ID,
      fullName: "Dr. Aydin Kaya",
      specialty: "Cardiovascular Surgery",
      phone: "+90 212 555 0101",
    }).onConflictDoNothing().returning(),
    db.insert(doctors).values({
      clinicId: CLINIC_ID,
      fullName: "Dr. Fatma Ozturk",
      specialty: "Fertility & IVF",
      phone: "+90 212 555 0102",
    }).onConflictDoNothing().returning(),
    db.insert(doctors).values({
      clinicId: CLINIC_ID,
      fullName: "Dr. Mehmet Yilmaz",
      specialty: "Orthopedic Surgery",
      phone: "+90 212 555 0103",
    }).onConflictDoNothing().returning(),
  ]);

  const [hotel1] = await db.insert(hotels).values({
    clinicId: CLINIC_ID,
    name: "Grand Istanbul Suites",
    address: "Beyoglu, Istanbul, Turkey",
    latitude: 41.0335,
    longitude: 28.9842,
    notes: "Partner hotel with daily shuttle to clinic",
  }).onConflictDoNothing().returning();

  const [hotel2] = await db.insert(hotels).values({
    clinicId: CLINIC_ID,
    name: "Bosphorus View Hotel",
    address: "Besiktas, Istanbul, Turkey",
    latitude: 41.0432,
    longitude: 29.0052,
  }).onConflictDoNothing().returning();

  const [transport1] = await db.insert(transports).values({
    clinicId: CLINIC_ID,
    driverName: "Kemal Ozdemir",
    driverPhone: "+90 532 123 4567",
    vehicleInfo: "Mercedes Vito - White (34 KOZ 789)",
    meetingPointText: "Istanbul Airport - International Arrivals Gate B",
    latitude: 41.2620,
    longitude: 28.7417,
  }).onConflictDoNothing().returning();

  const [transport2] = await db.insert(transports).values({
    clinicId: CLINIC_ID,
    driverName: "Ali Celik",
    driverPhone: "+90 533 987 6543",
    vehicleInfo: "Toyota Camry - Black (34 ALI 456)",
    meetingPointText: "Hotel Lobby - Daily 08:30",
  }).onConflictDoNothing().returning();

  await Promise.all([
    db.insert(documentTypes).values({ clinicId: CLINIC_ID, name: "Passport / ID", isRequired: true }).onConflictDoNothing(),
    db.insert(documentTypes).values({ clinicId: CLINIC_ID, name: "Medical History", isRequired: true }).onConflictDoNothing(),
    db.insert(documentTypes).values({ clinicId: CLINIC_ID, name: "Travel Insurance", isRequired: true }).onConflictDoNothing(),
    db.insert(documentTypes).values({ clinicId: CLINIC_ID, name: "Lab Results (recent)", isRequired: false, description: "Blood tests from last 3 months" }).onConflictDoNothing(),
    db.insert(documentTypes).values({ clinicId: CLINIC_ID, name: "Consent Form", isRequired: true }).onConflictDoNothing(),
  ]);

  const docTypes = await db.query.documentTypes.findMany({
    where: eq(documentTypes.clinicId, CLINIC_ID),
  });

  const existingPatient1 = await db.query.patients.findFirst({
    where: eq(patients.patientKey, "PATIENT-TEST-0001"),
  });

  let patient1Id: string;
  if (!existingPatient1) {
    const [p1] = await db.insert(patients).values({
      clinicId: CLINIC_ID,
      fullName: "Sarah Mitchell",
      patientKey: "PATIENT-TEST-0001",
      phone: "+44 20 7946 0301",
      email: "sarah.mitchell@example.com",
      nationality: "British",
      passportNo: "GBR123456",
      arrivalDate: "2026-03-10",
      departureDate: "2026-03-24",
      status: "ACTIVE",
      notes: "VIP patient. Requires wheelchair assistance at airport.",
    }).returning();
    patient1Id = p1.id;
    console.log("[seed] Created patient: Sarah Mitchell (PATIENT-TEST-0001)");
  } else {
    patient1Id = existingPatient1.id;
    console.log("[seed] Patient PATIENT-TEST-0001 already exists, skipping");
  }

  const existingPatient2 = await db.query.patients.findFirst({
    where: eq(patients.patientKey, "PATIENT-TEST-0002"),
  });

  let patient2Id: string;
  if (!existingPatient2) {
    const [p2] = await db.insert(patients).values({
      clinicId: CLINIC_ID,
      fullName: "James Thornton",
      patientKey: "PATIENT-TEST-0002",
      phone: "+1 310 555 0201",
      email: "james.thornton@example.com",
      nationality: "American",
      passportNo: "USA987654",
      arrivalDate: "2026-03-15",
      departureDate: "2026-04-01",
      status: "PENDING",
    }).returning();
    patient2Id = p2.id;
    console.log("[seed] Created patient: James Thornton (PATIENT-TEST-0002)");
  } else {
    patient2Id = existingPatient2.id;
    console.log("[seed] Patient PATIENT-TEST-0002 already exists, skipping");
  }

  const existingPlan = await db.query.patientPlans.findFirst({
    where: eq(patientPlans.patientId, patient1Id),
  });

  if (!existingPlan && hotel1 && transport1) {
    await db.insert(patientPlans).values({
      patientId: patient1Id,
      clinicId: CLINIC_ID,
      hotelId: hotel1.id,
      transportId: transport1.id,
      hotelStayDays: 14,
      roomNo: "412",
      checkInDate: "2026-03-10",
      checkOutDate: "2026-03-24",
    });
    console.log("[seed] Created plan for Sarah Mitchell");
  }

  const existingAppts = await db.query.appointments.findMany({
    where: eq(appointments.patientId, patient1Id),
  });

  if (existingAppts.length === 0 && doc1.length > 0) {
    await db.insert(appointments).values([
      {
        clinicId: CLINIC_ID,
        patientId: patient1Id,
        doctorId: doc1[0].id,
        title: "Pre-Op Cardiac Consultation",
        type: "Consultation",
        startAt: new Date("2026-03-11T09:00:00Z"),
        endAt: new Date("2026-03-11T10:00:00Z"),
        locationText: "Demo Clinic – Cardiology Wing, 3rd Floor",
        status: "SCHEDULED",
        notes: "Bring all recent lab results",
      },
      {
        clinicId: CLINIC_ID,
        patientId: patient1Id,
        doctorId: doc1[0].id,
        title: "Cardiac Surgery",
        type: "Surgery",
        startAt: new Date("2026-03-14T08:00:00Z"),
        endAt: new Date("2026-03-14T14:00:00Z"),
        locationText: "Demo Clinic – OR Block 2",
        status: "SCHEDULED",
      },
      {
        clinicId: CLINIC_ID,
        patientId: patient1Id,
        doctorId: doc1[0].id,
        title: "Post-Op Check-Up",
        type: "Follow-up",
        startAt: new Date("2026-03-18T11:00:00Z"),
        locationText: "Demo Clinic – Cardiology Wing, 3rd Floor",
        status: "SCHEDULED",
      },
    ]);
    console.log("[seed] Created appointments for Sarah Mitchell");
  }

  if (docTypes.length > 0) {
    const existingDocs = await db.query.patientDocuments.findMany({
      where: eq(patientDocuments.patientId, patient1Id),
    });
    if (existingDocs.length === 0) {
      await db.insert(patientDocuments).values(
        docTypes.slice(0, 3).map(dt => ({
          clinicId: CLINIC_ID,
          patientId: patient1Id,
          documentTypeId: dt.id,
          status: "ASSIGNED" as const,
        }))
      );
      console.log("[seed] Assigned documents to Sarah Mitchell");
    }
  }

  console.log("[seed] Database seed complete.");
}
