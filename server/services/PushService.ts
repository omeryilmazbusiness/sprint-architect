import { deviceTokenRepo } from "../repositories/deviceTokenRepo";

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
      console.error(`[PushService] Expo push API error ${res.status}: ${text}`);
    } else {
      const result = await res.json().catch(() => null);
      const failures = result?.data?.filter((r: any) => r.status === "error") ?? [];
      if (failures.length > 0) {
        console.warn(`[PushService] ${failures.length}/${tokens.length} push(es) failed:`, failures);
      } else {
        console.log(`[PushService] Sent ${tokens.length} push notification(s) successfully`);
      }
    }
  } catch (err) {
    console.error("[PushService] Failed to send push notifications:", err);
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
      console.error("[PushService] sendToRole error:", err);
    }
  },

  async sendToClinicRole(clinicId: string, role: string, payload: PushPayload): Promise<void> {
    try {
      const rows = await deviceTokenRepo.findByClinicAndRole(clinicId, role);
      if (rows.length > 0) {
        await sendBatch(rows.map((r) => r.token), payload);
      }
    } catch (err) {
      console.error("[PushService] sendToClinicRole error:", err);
    }
  },
};
