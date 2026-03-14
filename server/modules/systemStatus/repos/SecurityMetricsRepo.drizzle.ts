import { db } from "../../../db";
import { auditLogs, refreshTokens } from "@shared/schema";
import { and, eq, gte, count, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";

export interface SecurityMetrics {
  thisAdmin2faEnabled: boolean;
  failedAdminLoginsLast24h: number;
  thisAdminActiveSessions: number;
}

export async function getSecurityMetrics(adminUserId: string): Promise<SecurityMetrics> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [failRow] = await db
    .select({ cnt: count() })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.action, "USER_LOGIN_FAILED"),
        eq(auditLogs.actorRole, "ADMIN"),
        gte(auditLogs.createdAt, cutoff),
      ),
    );

  const [sessionRow] = await db
    .select({ cnt: count() })
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.userId, adminUserId),
        isNull(refreshTokens.revokedAt),
        gte(refreshTokens.expiresAt, new Date()),
      ),
    );

  return {
    thisAdmin2faEnabled: false,
    failedAdminLoginsLast24h: Number(failRow?.cnt ?? 0),
    thisAdminActiveSessions: Number(sessionRow?.cnt ?? 0),
  };
}
