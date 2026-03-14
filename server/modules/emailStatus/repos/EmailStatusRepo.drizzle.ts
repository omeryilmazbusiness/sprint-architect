import { db } from "../../../db";
import { emailEvents } from "@shared/schema";
import { desc, eq, gte, and, count } from "drizzle-orm";
import { sql } from "drizzle-orm";

export interface EmailEventRecord {
  type: string;
  status: "SUCCESS" | "FAILED";
  toEmail: string;
  errorMessageSafe?: string | null;
}

export async function insertEmailEvent(record: EmailEventRecord): Promise<void> {
  await db.insert(emailEvents).values({
    type: record.type,
    status: record.status,
    toEmail: record.toEmail,
    errorMessageSafe: record.errorMessageSafe ?? null,
  });
}

export interface EmailStatusSummary {
  smtpConfigured: boolean;
  lastEmailAt: string | null;
  lastEmailStatus: "SUCCESS" | "FAILED" | null;
  failedLast24h: number;
}

export async function getEmailStatusSummary(): Promise<EmailStatusSummary> {
  const smtpConfigured =
    !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

  const latest = await db.query.emailEvents.findFirst({
    orderBy: desc(emailEvents.createdAt),
  });

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [failRow] = await db
    .select({ cnt: count() })
    .from(emailEvents)
    .where(
      and(
        eq(emailEvents.status, "FAILED"),
        gte(emailEvents.createdAt, cutoff),
      ),
    );

  return {
    smtpConfigured,
    lastEmailAt: latest?.createdAt?.toISOString() ?? null,
    lastEmailStatus: latest?.status ?? null,
    failedLast24h: Number(failRow?.cnt ?? 0),
  };
}
