import { isSensitiveDocumentType } from "@shared/communityUploadTypes";

/** Same framing as client `lib/frameDisplayText.ts` for review API requests. */
const REVIEW_REPLACEMENTS: [RegExp, string][] = [
  [/\bInstitutions\b/g, "Communities"],
  [/\bInstitution\b/g, "Community"],
  [/\binstitutions\b/g, "communities"],
  [/\binstitution\b/g, "community"],
  [/\bClinics\b/g, "Communities"],
  [/\bClinic\b/g, "Community"],
  [/\bProviders\b/g, "Hosts"],
  [/\bProvider\b/g, "Host"],
  [/\bDoctors\b/g, "Hosts"],
  [/\bDoctor\b/g, "Host"],
  [/\bGuests\b/g, "Members"],
  [/\bGuest\b/g, "Member"],
  [/\bPatients\b/g, "Members"],
  [/\bPatient\b/g, "Member"],
  [/\bVisits\b/g, "Events"],
  [/\bVisit\b/g, "Event"],
  [/\bMedical\b/g, "Experience"],
  [/\bSurgery\b/g, "Experience"],
  [/\bCardiac\b/g, "Community"],
  [/\bCardiology\b/g, "Events"],
  [/\boperational archive\b/gi, "member archive"],
  [/\bPassport Photocopy\b/g, "Profile Photo"],
  [/\bPassport\b/g, "Profile Photo"],
  [/\bVisa\b/g, "Event Pass"],
  [/\bTravel Insurance\b/g, "Event Info"],
  [/\bConsent Form\b/g, "RSVP Form"],
];

export function frameUserFacingText(text: string, reviewMode: boolean): string {
  if (!reviewMode || !text) return text;
  let out = text;
  for (const [pattern, replacement] of REVIEW_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export function frameNotificationFields<T extends { title?: string; body?: string }>(
  item: T,
  reviewMode: boolean,
): T {
  if (!reviewMode) return item;
  return {
    ...item,
    ...(item.title !== undefined
      ? { title: frameUserFacingText(item.title, true) }
      : {}),
    ...(item.body !== undefined
      ? { body: frameUserFacingText(item.body, true) }
      : {}),
  };
}

function f(text: string | null | undefined, reviewMode: boolean): string | null {
  if (text == null) return text ?? null;
  return frameUserFacingText(text, reviewMode);
}

/** Frame guest dashboard API payload for App Store review clients. */
export function framePatientDashboardResponse<T extends Record<string, unknown>>(
  payload: T,
  reviewMode: boolean,
): T {
  if (!reviewMode) return payload;
  const p = payload as {
    patient?: { clinicName?: string | null };
    appointments?: Array<{
      title?: string;
      type?: string;
      locationText?: string | null;
      notes?: string | null;
      doctor?: { fullName?: string; specialty?: string | null } | null;
    }>;
    doctors?: Array<{ fullName?: string; specialty?: string | null; bio?: string | null }>;
    documents?: Array<{ documentType?: { name?: string } | null }>;
  };
  return {
    ...payload,
    patient: p.patient
      ? { ...p.patient, clinicName: f(p.patient.clinicName, true) }
      : p.patient,
    appointments: p.appointments?.map((a) => ({
      ...a,
      title: f(a.title, true) ?? a.title,
      type: f(a.type, true) ?? a.type,
      locationText: f(a.locationText, true),
      notes: f(a.notes, true),
      doctor: a.doctor
        ? {
            ...a.doctor,
            specialty: f(a.doctor.specialty, true),
          }
        : a.doctor,
    })),
    doctors: p.doctors?.map((d) => {
      const { diplomaUrl: _d, ...rest } = d as { diplomaUrl?: string | null };
      return {
        ...rest,
        specialty: f(d.specialty, true),
        bio: f(d.bio, true),
      };
    }),
    documents: p.documents
      ?.filter(
        (d) =>
          !d.documentType?.name ||
          !isSensitiveDocumentType(d.documentType.name, null),
      )
      .map((d) => ({
        ...d,
        documentType: d.documentType
          ? { ...d.documentType, name: f(d.documentType.name, true) ?? d.documentType.name }
          : d.documentType,
      })),
  } as T;
}

/** Manager member detail — hide passport; frame labels. */
export function frameGuestDetailResponse<T extends Record<string, unknown>>(
  detail: T,
  reviewMode: boolean,
): T {
  if (!reviewMode) return detail;
  const d = detail as {
    info?: { passportNo?: string | null; nationality?: string | null; [k: string]: unknown };
    documents?: Array<{ typeName?: string; [k: string]: unknown }>;
  };
  const info = d.info
    ? (() => {
        const { passportNo: _omit, ...rest } = d.info!;
        return rest;
      })()
    : d.info;
  const documents = d.documents?.filter(
    (doc) => !doc.typeName || !isSensitiveDocumentType(doc.typeName, null),
  ).map((doc) => ({
    ...doc,
    typeName: doc.typeName ? f(doc.typeName, true) ?? doc.typeName : doc.typeName,
  }));
  return { ...detail, info, documents } as T;
}

/** Manager dashboard — frame labels; drop sensitive pending upload names. */
export function frameManagerDashboardResponse<T extends Record<string, unknown>>(
  payload: T,
  reviewMode: boolean,
): T {
  if (!reviewMode) return payload;
  const d = payload as {
    pendingGuestDocs?: Array<{
      patientName?: string;
      pendingDocNames?: string[];
    }>;
    todayAppointments?: Array<{ title?: string; patientName?: string }>;
    monthAppointments?: Array<{ title?: string; patientName?: string }>;
    upcomingNext7Days?: number;
  };
  const mapAppt = (a: { title?: string; patientName?: string }) => ({
    ...a,
    title: a.title ? f(a.title, true) ?? a.title : a.title,
    patientName: a.patientName
      ? f(a.patientName.replace(/Demo Guest/i, "Demo Member"), true) ?? a.patientName
      : a.patientName,
  });
  return {
    ...payload,
    pendingGuestDocs: d.pendingGuestDocs
      ?.map((row) => ({
        ...row,
        patientName: row.patientName
          ? f(row.patientName.replace(/Demo Guest/i, "Demo Member"), true) ?? row.patientName
          : row.patientName,
        pendingDocNames: row.pendingDocNames
          ?.filter((n) => !isSensitiveDocumentType(n, null))
          .map((n) => f(n, true) ?? n),
      }))
      .filter((row) => (row.pendingDocNames?.length ?? 0) > 0),
    todayAppointments: d.todayAppointments?.map(mapAppt),
    monthAppointments: d.monthAppointments?.map(mapAppt),
  } as T;
}
