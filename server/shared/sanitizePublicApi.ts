import { isSensitiveDocumentType } from "@shared/communityUploadTypes";
import { frameUserFacingText } from "./frameUserFacingText";

/** Strip fields Apple may treat as identity / travel documents. */
export function stripSensitiveMemberFields<T extends Record<string, unknown>>(
  info: T,
  reviewMode: boolean,
): T {
  if (!reviewMode) return info;
  const { passportNo: _p, ...rest } = info as T & { passportNo?: string | null };
  return rest as T;
}

export function filterPublicDocumentTypeNames(
  name: string,
  code?: string | null,
  reviewMode = true,
): boolean {
  if (reviewMode && isSensitiveDocumentType(name, code)) return false;
  return true;
}

export function framePublicDocumentName(name: string, reviewMode: boolean): string {
  return reviewMode ? frameUserFacingText(name, true) : name;
}
