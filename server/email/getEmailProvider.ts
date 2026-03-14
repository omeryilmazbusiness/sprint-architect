import type { EmailProvider } from "./EmailProvider";
import { SmtpEmailProvider } from "./SmtpEmailProvider";
import { DevConsoleEmailProvider } from "./DevConsoleEmailProvider";
import { CircuitBreakerEmailProvider } from "./CircuitBreakerEmailProvider";

let _provider: CircuitBreakerEmailProvider | null = null;

export function getEmailProvider(): CircuitBreakerEmailProvider {
  if (_provider) return _provider;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  let inner: EmailProvider;
  if (host && port && user && pass && from) {
    console.log(`[email] Using SMTP provider (${host}:${port})`);
    inner = new SmtpEmailProvider({ host, port: parseInt(port), user, pass, from });
  } else {
    console.log("[email] SMTP not configured — using DevConsoleEmailProvider (emails logged only)");
    inner = new DevConsoleEmailProvider();
  }

  _provider = new CircuitBreakerEmailProvider(inner);
  return _provider;
}
