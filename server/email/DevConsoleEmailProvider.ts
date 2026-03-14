import type { EmailProvider, EmailMessage } from "./EmailProvider";
import { insertEmailEvent } from "../modules/emailStatus/repos/EmailStatusRepo.drizzle";

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
    console.log("[email:dev] ─────────────────────────────────────────────");
    console.log(`[email:dev] TO:      ${message.to}`);
    console.log(`[email:dev] SUBJECT: ${message.subject}`);
    console.log(`[email:dev] BODY:    ${(message.text ?? message.html).slice(0, 500)}`);
    console.log("[email:dev] ─────────────────────────────────────────────");

    insertEmailEvent({
      type: inferEmailType(message.subject),
      status: "SUCCESS",
      toEmail: message.to,
    }).catch((e) => console.error("[email:dev] Failed to record email event:", e));
  }
}
