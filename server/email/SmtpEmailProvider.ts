import nodemailer from "nodemailer";
import type { EmailProvider, EmailMessage } from "./EmailProvider";

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
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    console.log(`[email:smtp] Sent "${message.subject}" → ${message.to}`);
  }
}
