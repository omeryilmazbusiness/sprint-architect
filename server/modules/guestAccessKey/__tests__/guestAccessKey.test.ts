import { describe, it, expect } from "vitest";
import {
  getInstitutionLetterPool,
  pickRandomInstitutionLetters,
} from "../deriveInstitutionCode";
import { generateRandomLetterBlock } from "../generateRandomLetterBlock";
import {
  GuestAccessKeyGenerator,
  GUEST_ACCESS_KEY_REGEX,
  LEGACY_SLUG_GUEST_KEY_REGEX,
} from "../GuestAccessKeyGenerator";
import { normalizeGuestAccessKey, isRecognizedGuestAccessKeyFormat } from "../normalizeGuestAccessKey";
import { isGuestLoginAllowed } from "../guestLoginEligibility";
import { resolveGuestDeviceBinding } from "../guestDeviceBinding";

describe("getInstitutionLetterPool", () => {
  it("collects letters from institution name", () => {
    expect(getInstitutionLetterPool("Demo Institution")).toBe("DEMOINSTITUTION");
  });
});

describe("pickRandomInstitutionLetters", () => {
  it("only uses letters present in the institution name", () => {
    const pool = getInstitutionLetterPool("Acme Clinic");
    const samples = Array.from({ length: 40 }, () =>
      pickRandomInstitutionLetters("Acme Clinic", 4),
    );
    for (const sample of samples) {
      expect(sample).toMatch(/^[A-Z]{4}$/);
      for (const ch of sample) {
        expect(pool.includes(ch)).toBe(true);
      }
    }
  });
});

describe("generateRandomLetterBlock", () => {
  it("never returns blocked legacy prefix XYZD", () => {
    const blocks = Array.from({ length: 200 }, () => generateRandomLetterBlock(4));
    for (const block of blocks) {
      expect(block).toMatch(/^[A-Z]{4}$/);
      expect(block).not.toBe("XYZD");
    }
  });
});

describe("GuestAccessKeyGenerator", () => {
  it("generates XXXX-YYYY-#### (random · from institution · digits)", () => {
    const gen = new GuestAccessKeyGenerator();
    const institutionName = "Demo Institution";
    const pool = getInstitutionLetterPool(institutionName);
    const keys = Array.from({ length: 24 }, () => gen.generate(institutionName));

    for (const key of keys) {
      expect(key).toMatch(GUEST_ACCESS_KEY_REGEX);
      expect(LEGACY_SLUG_GUEST_KEY_REGEX.test(key)).toBe(false);
      expect(key.startsWith("xyzd")).toBe(false);
      expect(key.split("-")[0]).not.toBe("XYZD");

      const middle = key.split("-")[1]!;
      for (const ch of middle) {
        expect(pool.includes(ch)).toBe(true);
      }
      expect(key.split("-")[2]).toMatch(/^\d{4}$/);
    }

    const prefixes = new Set(keys.map((k) => k.split("-")[0]));
    const middles = new Set(keys.map((k) => k.split("-")[1]));
    expect(prefixes.size).toBeGreaterThan(1);
    expect(middles.size).toBeGreaterThan(1);
  });
});

describe("normalizeGuestAccessKey", () => {
  it("uppercases modern keys", () => {
    expect(normalizeGuestAccessKey("  wkpq-itno-0001  ")).toBe("WKPQ-ITNO-0001");
  });

  it("recognizes legacy slug keys separately from modern format", () => {
    expect(isRecognizedGuestAccessKeyFormat("xyzd-demo-institution-4821")).toBe(true);
    expect(isRecognizedGuestAccessKeyFormat("WKPQ-ITNO-4821")).toBe(true);
    expect(isRecognizedGuestAccessKeyFormat("bad")).toBe(false);
  });
});

describe("resolveGuestDeviceBinding", () => {
  it("rejects a second device", () => {
    expect(resolveGuestDeviceBinding("device-a", "device-b")).toEqual({
      action: "reject_other_device",
    });
  });
});

describe("isGuestLoginAllowed", () => {
  it("allows ACTIVE and APPROVED", () => {
    expect(isGuestLoginAllowed("ACTIVE")).toBe(true);
    expect(isGuestLoginAllowed("APPROVED")).toBe(true);
  });
});
