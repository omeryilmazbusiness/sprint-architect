import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { randomUUID } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      time: new Date().toISOString(),
      version: "1.0.0",
      service: "HealthTour API",
      environment: process.env.NODE_ENV || "development",
    });
  });

  app.get("/api/clinics", (_req: Request, res: Response) => {
    res.json([
      {
        id: "clinic-001",
        name: "Medica Istanbul",
        status: "ACTIVE",
        patientCount: 142,
        createdAt: "2024-01-15T10:00:00.000Z",
      },
      {
        id: "clinic-002",
        name: "Aegean Health Center",
        status: "ACTIVE",
        patientCount: 89,
        createdAt: "2024-02-20T10:00:00.000Z",
      },
    ]);
  });

  app.get("/api/patients", (_req: Request, res: Response) => {
    res.json([
      {
        id: "pat-001",
        name: "Sarah Mitchell",
        clinicId: "clinic-001",
        clinicName: "Medica Istanbul",
        status: "ACTIVE",
        procedure: "Cardiac Surgery",
        arrivalDate: "2026-03-10",
        assignedDoctor: "Dr. Aydin Kaya",
        patientKey: "PT-2026-001",
        createdAt: "2026-02-01T09:00:00.000Z",
      },
      {
        id: "pat-002",
        name: "James Thornton",
        clinicId: "clinic-001",
        clinicName: "Medica Istanbul",
        status: "PENDING",
        procedure: "Orthopedic Knee Replacement",
        arrivalDate: "2026-03-15",
        assignedDoctor: "Dr. Mehmet Yilmaz",
        patientKey: "PT-2026-002",
        createdAt: "2026-02-05T11:00:00.000Z",
      },
      {
        id: "pat-003",
        name: "Elena Vasquez",
        clinicId: "clinic-002",
        clinicName: "Aegean Health Center",
        status: "ACTIVE",
        procedure: "Cosmetic Rhinoplasty",
        arrivalDate: "2026-03-05",
        assignedDoctor: "Dr. Selin Arslan",
        patientKey: "PT-2026-003",
        createdAt: "2026-02-08T14:00:00.000Z",
      },
      {
        id: "pat-004",
        name: "David Park",
        clinicId: "clinic-002",
        clinicName: "Aegean Health Center",
        status: "INACTIVE",
        procedure: "Dental Implants",
        arrivalDate: "2026-02-20",
        assignedDoctor: "Dr. Zeynep Demir",
        patientKey: "PT-2026-004",
        createdAt: "2026-01-28T08:00:00.000Z",
      },
      {
        id: "pat-005",
        name: "Amira Hassan",
        clinicId: "clinic-001",
        clinicName: "Medica Istanbul",
        status: "ACTIVE",
        procedure: "IVF Treatment",
        arrivalDate: "2026-03-18",
        assignedDoctor: "Dr. Fatma Ozturk",
        patientKey: "PT-2026-005",
        createdAt: "2026-02-10T16:00:00.000Z",
      },
    ]);
  });

  app.get("/api/appointments", (_req: Request, res: Response) => {
    res.json([
      {
        id: "apt-001",
        patientName: "Sarah Mitchell",
        doctorName: "Dr. Aydin Kaya",
        type: "Pre-Op Consultation",
        date: "2026-03-08",
        time: "09:00",
        status: "CONFIRMED",
        clinicName: "Medica Istanbul",
      },
      {
        id: "apt-002",
        patientName: "James Thornton",
        doctorName: "Dr. Mehmet Yilmaz",
        type: "Initial Assessment",
        date: "2026-03-12",
        time: "11:30",
        status: "PENDING",
        clinicName: "Medica Istanbul",
      },
      {
        id: "apt-003",
        patientName: "Elena Vasquez",
        doctorName: "Dr. Selin Arslan",
        type: "Post-Op Follow-up",
        date: "2026-03-07",
        time: "14:00",
        status: "CONFIRMED",
        clinicName: "Aegean Health Center",
      },
      {
        id: "apt-004",
        patientName: "Amira Hassan",
        doctorName: "Dr. Fatma Ozturk",
        type: "Fertility Consultation",
        date: "2026-03-15",
        time: "10:00",
        status: "CONFIRMED",
        clinicName: "Medica Istanbul",
      },
    ]);
  });

  app.get("/api/transports", (_req: Request, res: Response) => {
    res.json([
      {
        id: "trn-001",
        patientName: "Sarah Mitchell",
        driverName: "Kemal Ozdemir",
        driverPhone: "+90 532 123 4567",
        from: "Istanbul Airport",
        to: "Medica Istanbul",
        date: "2026-03-10",
        time: "14:30",
        status: "SCHEDULED",
        vehicleType: "Private Van",
      },
      {
        id: "trn-002",
        patientName: "James Thornton",
        driverName: "Ali Celik",
        driverPhone: "+90 533 987 6543",
        from: "Grand Hotel Istanbul",
        to: "Medica Istanbul",
        date: "2026-03-12",
        time: "10:00",
        status: "SCHEDULED",
        vehicleType: "Sedan",
      },
      {
        id: "trn-003",
        patientName: "Elena Vasquez",
        driverName: "Burak Yildiz",
        driverPhone: "+90 535 246 8024",
        from: "Aegean Health Center",
        to: "Izmir Airport",
        date: "2026-03-08",
        time: "16:00",
        status: "COMPLETED",
        vehicleType: "Private Van",
      },
    ]);
  });

  app.get("/api/stats", (_req: Request, res: Response) => {
    res.json({
      totalPatients: 231,
      activePatients: 142,
      totalClinics: 2,
      appointmentsToday: 4,
      pendingTransports: 2,
      revenue: {
        thisMonth: 284500,
        lastMonth: 261200,
        currency: "USD",
      },
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
