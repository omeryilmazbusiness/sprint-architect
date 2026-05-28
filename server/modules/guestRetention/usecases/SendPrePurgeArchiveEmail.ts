import { AppError } from "../../../auth/errors";
import { ErrorCodes } from "../../../shared/errors/ErrorCodes";
import { getEmailProvider } from "../../../email/getEmailProvider";
import type { EmailAttachment } from "../../../email/EmailProvider";
import {
  guestRetentionArchiveEmailHtml,
  guestRetentionArchiveEmailText,
} from "../../../email/templates";
import { logger } from "../../../shared/logger";
import { exportGuestArchivePdf } from "../infra/PdfGuestArchiveExporter";
import { buildGuestFilesZip } from "../infra/ZipGuestFilesBundler";
import type { IGuestRetentionReadRepo } from "../ports/IGuestRetentionReadRepo";
import { guestRetentionReadRepo } from "../repos/GuestRetentionReadRepo.drizzle";

export interface SendPrePurgeArchiveEmailInput {
  patientId: string;
  clinicId: string;
}

export class SendPrePurgeArchiveEmail {
  constructor(private readonly repo: IGuestRetentionReadRepo = guestRetentionReadRepo) {}

  async execute(input: SendPrePurgeArchiveEmailInput): Promise<{ sent: boolean; to?: string }> {
    const bundle = await this.repo.loadArchiveBundle(input.patientId, input.clinicId);
    if (!bundle) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Guest not found or not scheduled for removal", 404);
    }

    const to = await this.repo.resolveManagerRecipientEmail(input.clinicId);
    if (!to) {
      logger.error("[guest-retention] No manager email for archive", {
        patientId: input.patientId,
        clinicId: input.clinicId,
      });
      throw new AppError(
        ErrorCodes.RETENTION_ARCHIVE_NO_RECIPIENT,
        "No manager email configured for archive delivery",
        503
      );
    }

    const pdf = await exportGuestArchivePdf(bundle);
    const zip =
      bundle.fileStorageKeys.length > 0 ? await buildGuestFilesZip(bundle.fileStorageKeys) : null;

    const safeKey = bundle.guestKey.replace(/[^a-zA-Z0-9_-]/g, "_");
    const attachments: EmailAttachment[] = [
      {
        filename: `guest-${safeKey}-summary.pdf`,
        content: pdf,
        contentType: "application/pdf",
      },
    ];
    if (zip && zip.length > 0) {
      attachments.push({
        filename: `guest-${safeKey}-files.zip`,
        content: zip,
        contentType: "application/zip",
      });
    }

    await getEmailProvider().send({
      to,
      subject: `[Healory] Guest archive — ${bundle.fullName} (${bundle.guestKey})`,
      html: guestRetentionArchiveEmailHtml({
        institutionName: bundle.institutionName,
        guestName: bundle.fullName,
        guestKey: bundle.guestKey,
        departureDate: bundle.departureDate,
        scheduledPurgeAt: bundle.scheduledPurgeAt,
        documentCount: bundle.documents.length,
        visitCount: bundle.visits.length,
      }),
      text: guestRetentionArchiveEmailText({
        institutionName: bundle.institutionName,
        guestName: bundle.fullName,
        guestKey: bundle.guestKey,
        departureDate: bundle.departureDate,
        scheduledPurgeAt: bundle.scheduledPurgeAt,
        documentCount: bundle.documents.length,
        visitCount: bundle.visits.length,
      }),
      attachments,
    });

    await this.repo.markArchiveSent(input.patientId, new Date());
    logger.info("[guest-retention] Archive email sent", {
      patientId: input.patientId,
      clinicId: input.clinicId,
      to,
    });
    return { sent: true, to };
  }
}

export const sendPrePurgeArchiveEmail = new SendPrePurgeArchiveEmail();
