import type { EmailProvider, EmailMessage } from "./EmailProvider";
import { insertEmailEvent } from "../modules/emailStatus/repos/EmailStatusRepo.drizzle";
import { logger } from "../shared/logger";

function inferEmailType(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes("invoice") || s.includes("billing")) return "INVOICE_EMAIL";
  if (s.includes("password") || s.includes("temporary")) return "RESET_PASSWORD";
  if (s.includes("monthly") || s.includes("report")) return "MONTHLY_REPORT";
  if (s.includes("access key") || s.includes("guest")) return "GUEST_ACCESS_KEY";
  return "GENERAL";
}

export class DevConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    logger.info("[email:dev] Email intercepted (dev mode — not sent)", {
      to: message.to,
      subject: message.subject,
      bodyPreview: (message.text ?? message.html ?? "").slice(0, 300),
    });

    insertEmailEvent({
      type: inferEmailType(message.subject),
      status: "SUCCESS",
      toEmail: message.to,
    }).catch((e: unknown) =>
      logger.error("[email:dev] Failed to record email event", {
        error: e instanceof Error ? e.message.slice(0, 200) : "unknown",
      })
    );
  }
}
