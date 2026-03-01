import type { EmailProvider, EmailMessage } from "./EmailProvider";

export class DevConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.log("[email:dev] ─────────────────────────────────────────────");
    console.log(`[email:dev] TO:      ${message.to}`);
    console.log(`[email:dev] SUBJECT: ${message.subject}`);
    console.log(`[email:dev] BODY:    ${(message.text ?? message.html).slice(0, 500)}`);
    console.log("[email:dev] ─────────────────────────────────────────────");
  }
}
