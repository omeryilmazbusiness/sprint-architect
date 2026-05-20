import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      role: insertUser.role ?? "MANAGER",
      clinicId: insertUser.clinicId ?? null,
      status: "ACTIVE",
      statusReason: null,
      fullName: null,
      phoneE164: null,
      mustChangePassword: false,
      lastLoginAt: null,
      lastLoginIp: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
