/**
 * Adds neutral API field aliases alongside legacy names (clinic/patient/doctor).
 * Clients may read either; legacy keys remain for backward compatibility.
 */

const FIELD_ALIASES: Record<string, string> = {
  clinicId: "organizationId",
  clinicName: "organizationName",
  patientId: "memberId",
  patientCount: "memberCount",
  patientKey: "memberKey",
  patientName: "memberName",
  doctorId: "providerId",
  doctorName: "providerName",
  appointmentId: "visitId",
};

const ARRAY_KEY_ALIASES: Record<string, string> = {
  clinics: "organizations",
  patients: "members",
  doctors: "providers",
  appointments: "visits",
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function enrichObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...obj };

  for (const [legacyKey, neutralKey] of Object.entries(FIELD_ALIASES)) {
    if (legacyKey in obj && !(neutralKey in out)) {
      out[neutralKey] = obj[legacyKey];
    }
  }

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      const neutralArrayKey = ARRAY_KEY_ALIASES[key];
      const enriched = value.map((item) => enrichValue(item));
      out[key] = enriched;
      if (neutralArrayKey && !(neutralArrayKey in out)) {
        out[neutralArrayKey] = enriched;
      }
      continue;
    }

    if (isPlainObject(value)) {
      out[key] = enrichObject(value);
      const neutralKey = ARRAY_KEY_ALIASES[key];
      if (neutralKey && !(neutralKey in out)) {
        out[neutralKey] = out[key];
      }
    }
  }

  return out;
}

function enrichValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(enrichValue);
  }
  if (isPlainObject(value)) {
    return enrichObject(value);
  }
  return value;
}

export function enrichResponseWithNeutralAliases<T>(body: T): T {
  if (body === null || body === undefined) {
    return body;
  }
  if (Array.isArray(body)) {
    return enrichValue(body) as T;
  }
  if (isPlainObject(body)) {
    return enrichObject(body) as T;
  }
  return body;
}

export function neutralAliasMiddleware(
  _req: unknown,
  res: { json: (body: unknown) => unknown },
  next: () => void,
): void {
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) =>
    originalJson(enrichResponseWithNeutralAliases(body))) as typeof res.json;
  next();
}
