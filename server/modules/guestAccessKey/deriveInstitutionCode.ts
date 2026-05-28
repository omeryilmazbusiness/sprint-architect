import { randomInt } from "crypto";

/** Extract uppercase letter pool from institution name (for random sampling). */
export function getInstitutionLetterPool(institutionName: string): string {
  const letters = institutionName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();

  return letters.length > 0 ? letters : "INSTITUTION";
}

/**
 * 4 random uppercase letters sampled from institution name (with replacement).
 * Example: "Demo Institution" → "ITND" (letters drawn from DEMOINSTITUTION pool)
 */
export function pickRandomInstitutionLetters(
  institutionName: string,
  length = 4,
): string {
  const pool = getInstitutionLetterPool(institutionName);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += pool[randomInt(0, pool.length)]!;
  }
  return out;
}

/** @deprecated Use pickRandomInstitutionLetters — kept for tests/migrations. */
export function deriveInstitutionCode(institutionName: string): string {
  return pickRandomInstitutionLetters(institutionName, 4);
}
