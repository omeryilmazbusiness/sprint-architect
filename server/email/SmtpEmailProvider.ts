import nodemailer from "nodemailer";
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

export class SmtpEmailProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor(opts: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  }) {
    this.from = opts.from;
    this.transporter = nodemailer.createTransport({
      host: opts.host,
      port: opts.port,
      secure: opts.port === 465,
      auth: { user: opts.user, pass: opts.pass },
    });
  }

  async send(message: EmailMessage): Promise<void> {
    const type = inferEmailType(message.subject);
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      console.log(`[email:smtp] Sent "${message.subject}" → ${message.to}`);
      insertEmailEvent({ type, status: "SUCCESS", toEmail: message.to }).catch((e) =>
        console.error("[email:smtp] Failed to record email event:", e)
      );
    } catch (err: unknown) {
      const safe =
        err instanceof Error
          ? err.message.replace(/password=\S+/gi, "***").slice(0, 200)
          : "SMTP error";
      console.error(`[email:smtp] Failed to send "${message.subject}" → ${message.to}:`, err);
      insertEmailEvent({ type, status: "FAILED", toEmail: message.to, errorMessageSafe: safe }).catch((e) =>
        console.error("[email:smtp] Failed to record email failure event:", e)
      );
      throw err;
    }
  }
}
