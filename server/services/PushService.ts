import { deviceTokenRepo } from "../repositories/deviceTokenRepo";
import { logger } from "../shared/logger";

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

async function sendBatch(tokens: string[], payload: PushPayload): Promise<void> {
  if (tokens.length === 0) return;

  const messages = tokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    sound: "default",
    priority: "high",
    channelId: "default",
  }));

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "(no body)");
      logger.error("[PushService] Expo push API error", {
        status: res.status,
        body: text.slice(0, 200),
        tokenCount: tokens.length,
      });
    } else {
      const result = await res.json().catch(() => null);
      const failures = (result?.data as Array<{ status: string }> | undefined)
        ?.filter((r) => r.status === "error") ?? [];
      if (failures.length > 0) {
        logger.warn(`[PushService] ${failures.length}/${tokens.length} push(es) failed`, {
          failureCount: failures.length,
          totalCount: tokens.length,
        });
      } else {
        logger.info("[PushService] Push notification(s) sent successfully", {
          count: tokens.length,
        });
      }
    }
  } catch (err) {
    logger.error("[PushService] Failed to send push notifications", {
      error: err instanceof Error ? err.message.slice(0, 200) : "unknown",
      tokenCount: tokens.length,
    });
  }
}

export const pushService = {
  async sendToRole(role: string, payload: PushPayload): Promise<void> {
    try {
      const rows = await deviceTokenRepo.findByRole(role);
      if (rows.length > 0) {
        await sendBatch(rows.map((r) => r.token), payload);
      }
    } catch (err) {
      logger.error("[PushService] sendToRole error", {
        role,
        error: err instanceof Error ? err.message.slice(0, 200) : "unknown",
      });
    }
  },

  async sendToClinicRole(clinicId: string, role: string, payload: PushPayload): Promise<void> {
    try {
      const rows = await deviceTokenRepo.findByClinicAndRole(clinicId, role);
      if (rows.length > 0) {
        await sendBatch(rows.map((r) => r.token), payload);
      }
    } catch (err) {
      logger.error("[PushService] sendToClinicRole error", {
        role,
        error: err instanceof Error ? err.message.slice(0, 200) : "unknown",
      });
    }
  },

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    try {
      const rows = await deviceTokenRepo.findByUserId(userId);
      if (rows.length > 0) {
        await sendBatch(rows.map((r) => r.token), payload);
      }
    } catch (err) {
      logger.error("[PushService] sendToUser error", {
        userId,
        error: err instanceof Error ? err.message.slice(0, 200) : "unknown",
      });
    }
  },
};
