import { randomBytes } from "crypto";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SPECIAL = "@#!%^&*";
const ALL = UPPER + LOWER + DIGITS + SPECIAL;

function pickFrom(set: string, bytes: Buffer, offset: number): string {
  return set[bytes[offset] % set.length];
}

export function generateTempPassword(): string {
  const buf = randomBytes(32);
  const chars: string[] = [
    pickFrom(UPPER, buf, 0),
    pickFrom(UPPER, buf, 1),
    pickFrom(LOWER, buf, 2),
    pickFrom(LOWER, buf, 3),
    pickFrom(DIGITS, buf, 4),
    pickFrom(DIGITS, buf, 5),
    pickFrom(SPECIAL, buf, 6),
    pickFrom(SPECIAL, buf, 7),
    ...Array.from({ length: 8 }, (_, i) => pickFrom(ALL, buf, 8 + i)),
  ];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = buf[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function generateGuestKey(): string {
  const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = randomBytes(16);
  const part = (offset: number, len: number) =>
    Array.from({ length: len }, (_, i) => CHARS[buf[offset + i] % CHARS.length]).join("");
  return `GUEST-${part(0, 4)}-${part(4, 4)}`;
}
