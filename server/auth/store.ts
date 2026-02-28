import crypto from "crypto";
import { hashPassword } from "./password";

export interface StoredClinic {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
}

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  role: "ADMIN" | "MANAGER" | "PATIENT";
  clinicId: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
}

export interface StoredPatient {
  id: string;
  clinicId: string;
  fullName: string;
  arrivalDate: string | null;
  departureDate: string | null;
  patientKey: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

export interface StoredDevice {
  id: string;
  patientId: string;
  deviceId: string;
  boundAt: string;
  revokedAt: string | null;
}

export interface StoredRefreshToken {
  id: string;
  userId: string | null;
  patientId: string | null;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

class AuthStore {
  clinics: Map<string, StoredClinic> = new Map();
  users: Map<string, StoredUser> = new Map();
  patients: Map<string, StoredPatient> = new Map();
  devices: Map<string, StoredDevice> = new Map();
  refreshTokens: Map<string, StoredRefreshToken> = new Map();

  private newId(): string {
    return crypto.randomUUID();
  }

  findUserByEmail(email: string): StoredUser | undefined {
    return Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
  }

  findUserById(id: string): StoredUser | undefined {
    return this.users.get(id);
  }

  findPatientByKey(key: string): StoredPatient | undefined {
    return Array.from(this.patients.values()).find(
      (p) => p.patientKey === key,
    );
  }

  findPatientById(id: string): StoredPatient | undefined {
    return this.patients.get(id);
  }

  getActiveDeviceForPatient(patientId: string): StoredDevice | undefined {
    return Array.from(this.devices.values()).find(
      (d) => d.patientId === patientId && d.revokedAt === null,
    );
  }

  bindDevice(patientId: string, deviceId: string): StoredDevice {
    const device: StoredDevice = {
      id: this.newId(),
      patientId,
      deviceId,
      boundAt: new Date().toISOString(),
      revokedAt: null,
    };
    this.devices.set(device.id, device);
    return device;
  }

  revokeDevice(patientId: string): void {
    for (const [id, d] of this.devices) {
      if (d.patientId === patientId && d.revokedAt === null) {
        this.devices.set(id, { ...d, revokedAt: new Date().toISOString() });
      }
    }
  }

  storeRefreshToken(opts: {
    userId?: string;
    patientId?: string;
    token: string;
    expiresAt: Date;
  }): void {
    const entry: StoredRefreshToken = {
      id: this.newId(),
      userId: opts.userId ?? null,
      patientId: opts.patientId ?? null,
      tokenHash: hashToken(opts.token),
      expiresAt: opts.expiresAt.toISOString(),
      revokedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.refreshTokens.set(entry.id, entry);
  }

  findActiveRefreshToken(token: string): StoredRefreshToken | undefined {
    const h = hashToken(token);
    return Array.from(this.refreshTokens.values()).find(
      (rt) =>
        rt.tokenHash === h &&
        rt.revokedAt === null &&
        new Date(rt.expiresAt) > new Date(),
    );
  }

  revokeRefreshToken(token: string): void {
    const h = hashToken(token);
    for (const [id, rt] of this.refreshTokens) {
      if (rt.tokenHash === h) {
        this.refreshTokens.set(id, { ...rt, revokedAt: new Date().toISOString() });
      }
    }
  }

  revokeAllRefreshTokensForUser(userId: string): void {
    for (const [id, rt] of this.refreshTokens) {
      if (rt.userId === userId && rt.revokedAt === null) {
        this.refreshTokens.set(id, { ...rt, revokedAt: new Date().toISOString() });
      }
    }
  }

  getAllClinics(): StoredClinic[] {
    return Array.from(this.clinics.values());
  }

  getClinicById(id: string): StoredClinic | undefined {
    return this.clinics.get(id);
  }

  getAllPatientsByClinic(clinicId: string): StoredPatient[] {
    return Array.from(this.patients.values()).filter(
      (p) => p.clinicId === clinicId,
    );
  }
}

export const authStore = new AuthStore();

export async function seedAuthStore(): Promise<void> {
  const clinicId = "clinic-demo-001";
  authStore.clinics.set(clinicId, {
    id: clinicId,
    name: "Demo Clinic",
    status: "ACTIVE",
    createdAt: "2024-01-01T00:00:00.000Z",
  });

  const adminId = "user-admin-001";
  authStore.users.set(adminId, {
    id: adminId,
    email: "admin@demo.com",
    passwordHash: await hashPassword("Admin123!"),
    role: "ADMIN",
    clinicId: null,
    status: "ACTIVE",
    createdAt: "2024-01-01T00:00:00.000Z",
  });

  const managerId = "user-manager-001";
  authStore.users.set(managerId, {
    id: managerId,
    email: "manager@demo.com",
    passwordHash: await hashPassword("Manager123!"),
    role: "MANAGER",
    clinicId: clinicId,
    status: "ACTIVE",
    createdAt: "2024-01-01T00:00:00.000Z",
  });

  const patientId = "patient-test-001";
  authStore.patients.set(patientId, {
    id: patientId,
    clinicId: clinicId,
    fullName: "Test Patient",
    arrivalDate: "2026-03-10",
    departureDate: null,
    patientKey: "PATIENT-TEST-0001",
    status: "ACTIVE",
    createdAt: "2024-01-15T00:00:00.000Z",
  });

  console.log(
    "[seed] Demo accounts ready:\n" +
    "  Admin:   admin@demo.com   / Admin123!\n" +
    "  Manager: manager@demo.com / Manager123!\n" +
    "  Patient: key=PATIENT-TEST-0001",
  );
}
