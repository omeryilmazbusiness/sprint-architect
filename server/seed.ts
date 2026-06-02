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
  notifications,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth/password";

const CLINIC_ID = "clinic-demo-001";
const REVIEW_MODE = process.env.EXPO_PUBLIC_REVIEW_MODE === "1" || process.env.REVIEW_MODE === "1";
const DEMO_CLINIC_NAME = REVIEW_MODE ? "Demo Community" : "Demo Institution";

export async function seedDatabase() {
  console.log("[seed] Starting database seed...");

  await db.insert(clinics)
    .values({
      id: CLINIC_ID,
      name: DEMO_CLINIC_NAME,
      status: "ACTIVE",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
    })
    .onConflictDoUpdate({
      target: clinics.id,
      set: { name: DEMO_CLINIC_NAME },
    });

  // Seed Users
  const adminPasswordHash = await hashPassword("Admin123!");
  const managerPasswordHash = await hashPassword("Manager123!");

  for (const user of [
    { id: "user-admin-001", email: "admin@demo.com", passwordHash: adminPasswordHash, role: "SUPER_ADMIN" as const, clinicId: null as string | null, status: "ACTIVE" as const },
    { id: "user-manager-001", email: "manager@demo.com", passwordHash: managerPasswordHash, role: "MANAGER" as const, clinicId: CLINIC_ID, status: "ACTIVE" as const },
  ]) {
    await db.insert(users).values(user).onConflictDoUpdate({
      target: users.id,
      set: { passwordHash: user.passwordHash, status: user.status, role: user.role, clinicId: user.clinicId },
    });
  }
  console.log("[seed] Users seeded (admin, manager)");

  const [doc1, doc2, doc3] = await Promise.all([
    db.insert(doctors).values({
      clinicId: CLINIC_ID,
      fullName: "Aydin Kaya",
      specialty: "Operations Lead",
      phone: "+90 212 555 0101",
    }).onConflictDoNothing().returning(),
    db.insert(doctors).values({
      clinicId: CLINIC_ID,
      fullName: "Fatma Ozturk",
      specialty: "Guest Services",
      phone: "+90 212 555 0102",
    }).onConflictDoNothing().returning(),
    db.insert(doctors).values({
      clinicId: CLINIC_ID,
      fullName: "Mehmet Yilmaz",
      specialty: "Logistics Coordinator",
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

  const demoDocTypes = REVIEW_MODE
    ? [
        { name: "Profile Photo", code: "PROFILE_PHOTO", isRequired: true },
        { name: "Travel Itinerary (PDF)", code: "ITINERARY_PDF", isRequired: false },
        { name: "Ticket / Reservation", code: "TICKET_RESERVATION", isRequired: false },
        { name: "Internal note (staff only)", code: "INTERNAL_REF", isRequired: false },
      ]
    : [
        { name: "Passport Photocopy", code: "PASSPORT_COPY", isRequired: true },
        { name: "Visa", code: "VISA", isRequired: true },
        { name: "Internal reference (staff only)", code: "INTERNAL_REF", isRequired: false },
        { name: "Travel Insurance", code: "TRAVEL_INSURANCE", isRequired: true },
        { name: "Consent Form", code: "CONSENT_FORM", isRequired: true },
      ];

  await Promise.all(
    demoDocTypes.map((dt) =>
      db
        .insert(documentTypes)
        .values({ clinicId: CLINIC_ID, name: dt.name, code: dt.code, isRequired: dt.isRequired })
        .onConflictDoNothing(),
    ),
  );

  // Update codes on existing document types for this clinic
  const existingDocTypes = await db.query.documentTypes.findMany({
    where: eq(documentTypes.clinicId, CLINIC_ID),
  });

  for (const dt of existingDocTypes) {
    // Legacy normalization for older seeded names
    if (!REVIEW_MODE) {
      if (dt.name === "Passport / ID" && !dt.code) {
        await db.update(documentTypes).set({ code: "PASSPORT_COPY", name: "Passport Photocopy" }).where(eq(documentTypes.id, dt.id));
      }
      if (dt.name === "Passport Photocopy" && !dt.code) {
        await db.update(documentTypes).set({ code: "PASSPORT_COPY" }).where(eq(documentTypes.id, dt.id));
      }
      if (dt.name === "Visa" && !dt.code) {
        await db.update(documentTypes).set({ code: "VISA" }).where(eq(documentTypes.id, dt.id));
      }
      if (dt.name === "Travel Insurance" && !dt.code) {
        await db.update(documentTypes).set({ code: "TRAVEL_INSURANCE" }).where(eq(documentTypes.id, dt.id));
      }
      if (dt.name === "Consent Form" && !dt.code) {
        await db.update(documentTypes).set({ code: "CONSENT_FORM" }).where(eq(documentTypes.id, dt.id));
      }
    }
    if ((dt.name === "Medical History" || dt.name === "Lab Results (recent)") && dt.code !== "INTERNAL_REF") {
      await db.update(documentTypes).set({ code: "INTERNAL_REF", name: "Internal reference (staff only)" }).where(eq(documentTypes.id, dt.id));
    }
  }
  console.log("[seed] Document type codes updated");

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
    const venue = REVIEW_MODE ? "Demo Community Hub" : `${DEMO_CLINIC_NAME} – Cardiology Wing, 3rd Floor`;
    const eventType1 = REVIEW_MODE ? "Meetup" : "Consultation";
    const eventType2 = REVIEW_MODE ? "Event" : "Surgery";
    const eventType3 = REVIEW_MODE ? "Check-in" : "Follow-up";
    await db.insert(appointments).values([
      {
        clinicId: CLINIC_ID,
        patientId: patient1Id,
        doctorId: doc1[0].id,
        title: REVIEW_MODE ? "Welcome Meetup" : "Pre-Op Cardiac Consultation",
        type: eventType1,
        startAt: new Date("2026-03-11T09:00:00Z"),
        endAt: new Date("2026-03-11T10:00:00Z"),
        locationText: venue,
        status: "SCHEDULED",
        notes: REVIEW_MODE ? "Bring your questions and say hello." : "Bring all recent lab results",
      },
      {
        clinicId: CLINIC_ID,
        patientId: patient1Id,
        doctorId: doc1[0].id,
        title: REVIEW_MODE ? "City Walk Event" : "Cardiac Surgery",
        type: eventType2,
        startAt: new Date("2026-03-14T08:00:00Z"),
        endAt: new Date("2026-03-14T14:00:00Z"),
        locationText: REVIEW_MODE ? "Downtown Meetup Point" : `${DEMO_CLINIC_NAME} – OR Block 2`,
        status: "SCHEDULED",
      },
      {
        clinicId: CLINIC_ID,
        patientId: patient1Id,
        doctorId: doc1[0].id,
        title: REVIEW_MODE ? "Community Check-in" : "Post-Op Check-Up",
        type: eventType3,
        startAt: new Date("2026-03-18T11:00:00Z"),
        locationText: venue,
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

  // Seed demo notifications for manager
  await db.insert(notifications).values([
    {
      clinicId: CLINIC_ID,
      targetRole: "MANAGER",
      title: REVIEW_MODE ? "New event scheduled" : "New visit scheduled",
      body: REVIEW_MODE
        ? "Sarah Mitchell has a new event tomorrow at 09:00"
        : "Sarah Mitchell has a visit with provider Aydin Kaya tomorrow at 09:00",
      type: "APPOINTMENT",
      status: "UNREAD",
      relatedType: "appointment",
    },
    {
      clinicId: CLINIC_ID,
      targetRole: "MANAGER",
      title: REVIEW_MODE ? "New upload" : "Document uploaded",
      body: REVIEW_MODE
        ? "Sarah Mitchell uploaded a new file"
        : "Guest Sarah Mitchell uploaded their passport file",
      type: "DOCUMENT",
      status: "UNREAD",
      relatedType: "document",
    },
    {
      clinicId: CLINIC_ID,
      targetRole: "MANAGER",
      title: "Guest checked in",
      body: REVIEW_MODE ? "A new member joined Demo Community" : `New member registered at ${DEMO_CLINIC_NAME}`,
      type: "INFO",
      status: "READ",
      relatedType: "patient",
    },
  ]).onConflictDoNothing();
  console.log("[seed] Notifications seeded for manager");

  console.log("[seed] Database seed complete.");
}

const isDirectRun = process.argv[1]?.includes("seed.ts");
if (isDirectRun) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error("[seed] Failed:", err);
      process.exit(1);
    });
}
