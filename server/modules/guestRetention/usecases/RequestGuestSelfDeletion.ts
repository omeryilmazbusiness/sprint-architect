import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { patients } from "@shared/schema";
import { AppError } from "../../../auth/errors";
import { ErrorCodes } from "../../../shared/errors/ErrorCodes";
import { auditLog } from "../../../api/auditLogger";
import { selfDeleteRetentionFields } from "../domain/computeRetentionSchedule";
import type { IGuestRetentionReadRepo } from "../ports/IGuestRetentionReadRepo";
import { guestRetentionReadRepo } from "../repos/GuestRetentionReadRepo.drizzle";
import { SendPrePurgeArchiveEmail } from "./SendPrePurgeArchiveEmail";

export interface RequestGuestSelfDeletionInput {
  patientId: string;
}

export interface RequestGuestSelfDeletionResult {
  scheduledPurgeAt: string;
  archiveSent: boolean;
}

export class RequestGuestSelfDeletion {
  constructor(
    private readonly repo: IGuestRetentionReadRepo = guestRetentionReadRepo,
    private readonly sendArchive = new SendPrePurgeArchiveEmail()
  ) {}

  async execute(input: RequestGuestSelfDeletionInput): Promise<RequestGuestSelfDeletionResult> {
    const guest = await this.repo.findGuestForSelfDelete(input.patientId);
    if (!guest) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Member not found", 404);
    }
    if (guest.retentionPurgedAt) {
      throw new AppError(ErrorCodes.RETENTION_ALREADY_PURGED, "Account already removed", 410);
    }
    if (guest.retentionSource === "SELF_DELETE" && guest.scheduledPurgeAt) {
      throw new AppError(
        ErrorCodes.RETENTION_SELF_DELETE_ACTIVE,
        "Account removal is already scheduled",
        409
      );
    }

    const fields = selfDeleteRetentionFields();
    await db.update(patients).set(fields).where(eq(patients.id, input.patientId));

    let archiveSent = false;
    try {
      await this.sendArchive.execute({ patientId: guest.id, clinicId: guest.clinicId });
      archiveSent = true;
    } catch {
      // Purge tick will retry archive before purge when lead window allows
    }

    auditLog({
      clinicId: guest.clinicId,
      actorId: guest.id,
      actorRole: "PATIENT",
      action: "GUEST_SELF_DELETE_REQUESTED",
      resourceType: "patient",
      resourceId: guest.id,
      metadata: { scheduledPurgeAt: fields.scheduledPurgeAt.toISOString() },
    });

    return {
      scheduledPurgeAt: fields.scheduledPurgeAt.toISOString(),
      archiveSent,
    };
  }
}

export const requestGuestSelfDeletion = new RequestGuestSelfDeletion();
