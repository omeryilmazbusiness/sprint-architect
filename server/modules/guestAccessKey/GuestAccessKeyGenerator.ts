import { randomInt } from "crypto";
import { pickRandomInstitutionLetters } from "./deriveInstitutionCode";
import { generateRandomLetterBlock } from "./generateRandomLetterBlock";

/** Legacy format from earlier releases. */
export const LEGACY_PATIENT_KEY_REGEX = /^PT-[A-Z0-9]{8}$/;

/** Earlier slug-based format: xyzd-{institution-slug}-{4digits} */
export const LEGACY_SLUG_GUEST_KEY_REGEX = /^xyzd-[a-z0-9]+(?:-[a-z0-9]+)*-\d{4}$/i;

/** Fixed-prefix formats superseded by random-prefix keys. */
export const LEGACY_HEAL_GUEST_KEY_REGEX = /^HEAL-[A-Z0-9]{4}-\d{4}$/;
export const LEGACY_HL_GUEST_KEY_REGEX = /^HL-[A-Z0-9]{4}-\d{4}$/;

/**
 * Current format: XXXX-YYYY-####
 * - XXXX: random uppercase letters (never XYZD / legacy product codes)
 * - YYYY: 4 random letters sampled from institution name
 * - ####: random digits
 */
export const GUEST_ACCESS_KEY_REGEX = /^[A-Z]{4}-[A-Z]{4}-\d{4}$/;

export const GUEST_ACCESS_KEY_FORMAT_VERSION = 3;

/** @deprecated Keys no longer use a fixed product prefix. */
export const GUEST_ACCESS_KEY_PRODUCT_CODE = "HL";
/** @deprecated Use GUEST_ACCESS_KEY_REGEX */
export const GUEST_ACCESS_KEY_PREFIX = GUEST_ACCESS_KEY_PRODUCT_CODE;

export const MAX_KEY_ATTEMPTS = 8;

export class GuestAccessKeyGenerator {
  generate(institutionName: string): string {
    const prefix = generateRandomLetterBlock(4);
    const institution = pickRandomInstitutionLetters(institutionName, 4);
    const digits = String(randomInt(0, 10_000)).padStart(4, "0");
    return `${prefix}-${institution}-${digits}`;
  }
}

export const guestAccessKeyGenerator = new GuestAccessKeyGenerator();
