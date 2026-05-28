import { randomInt } from "crypto";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Legacy fixed prefixes — never use as random block 1. */
const BLOCKED_PREFIXES = new Set(["XYZD", "HEAL", "HLOR", "HLXX"]);

/** Cryptographically random uppercase letter block (default 4). */
export function generateRandomLetterBlock(length = 4): string {
  if (length !== 4) {
    let out = "";
    for (let i = 0; i < length; i++) {
      out += LETTERS[randomInt(0, LETTERS.length)]!;
    }
    return out;
  }

  for (let attempt = 0; attempt < 32; attempt++) {
    let out = "";
    for (let i = 0; i < 4; i++) {
      out += LETTERS[randomInt(0, LETTERS.length)]!;
    }
    if (!BLOCKED_PREFIXES.has(out)) return out;
  }

  return "WKPQ";
}
