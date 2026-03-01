import type { EmailProvider } from "./EmailProvider";
import { SmtpEmailProvider } from "./SmtpEmailProvider";
import { DevConsoleEmailProvider } from "./DevConsoleEmailProvider";

let _provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (_provider) return _provider;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (host && port && user && pass && from) {
    console.log(`[email] Using SMTP provider (${host}:${port})`);
    _provider = new SmtpEmailProvider({
      host,
      port: parseInt(port),
      user,
      pass,
      from,
    });
  } else {
    console.log("[email] SMTP not configured — using DevConsoleEmailProvider (emails logged only)");
    _provider = new DevConsoleEmailProvider();
  }

  return _provider;
}
