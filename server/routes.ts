import type { Express } from "express";
import { createServer, type Server } from "node:http";
import authRoutes from "./auth/authRoutes";
import patientRoutes from "./auth/patientRoutes";
import meRoutes from "./auth/meRoutes";
import managerRoutes from "./api/managerRoutes";
import adminRoutes from "./api/adminRoutes";
import adminDashboardRoutes from "./modules/adminDashboard/adminDashboard.routes";
import adminUsersModuleRoutes from "./modules/adminUsers/adminUsers.routes";
import systemStatusRoutes from "./modules/systemStatus/systemStatus.routes";
import jobRunsRoutes from "./modules/jobRuns/jobRuns.routes";
import emailStatusRoutes from "./modules/emailStatus/emailStatus.routes";
import adminPatientsRoutes from "./modules/adminPatients/adminPatients.routes";
import uploadRoutes from "./api/uploadRoutes";
import patientDashboardRoute from "./api/patientDashboardRoute";
import { errorHandler } from "./auth/middleware";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      time: new Date().toISOString(),
      version: "1.0.0",
      service: "HealthTour API",
      environment: process.env.NODE_ENV || "development",
    });
  });

  app.get("/api/stats", (_req, res) => {
    res.json({
      totalPatients: 0,
      activePatients: 0,
      totalClinics: 1,
      appointmentsToday: 0,
      pendingTransports: 0,
      revenue: { thisMonth: 0, lastMonth: 0, currency: "USD" },
    });
  });

  app.use("/v1/auth", authRoutes);
  app.use("/v1/patient", patientRoutes);
  app.use("/v1/patient", patientDashboardRoute);
  app.use("/v1/admin", adminRoutes);
  app.use("/v1/admin", adminDashboardRoutes);
  app.use("/v1/admin", adminUsersModuleRoutes);
  app.use("/v1/admin", systemStatusRoutes);
  app.use("/v1/admin", jobRunsRoutes);
  app.use("/v1/admin", emailStatusRoutes);
  app.use("/v1/admin", adminPatientsRoutes);
  app.use("/v1/manager", managerRoutes);
  app.use("/v1", meRoutes);
  app.use("/v1", uploadRoutes);

  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}
