import {
  parsePhoneNumber,
  isValidPhoneNumber,
  AsYouType,
} from "libphonenumber-js";

export interface CountryInfo {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
}

export const COUNTRIES: CountryInfo[] = [
  { code: "TR", dialCode: "+90", name: "Turkey", flag: "🇹🇷" },
  { code: "DE", dialCode: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "GB", dialCode: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "US", dialCode: "+1", name: "United States", flag: "🇺🇸" },
  { code: "AE", dialCode: "+971", name: "UAE", flag: "🇦🇪" },
  { code: "RU", dialCode: "+7", name: "Russia", flag: "🇷🇺" },
  { code: "SA", dialCode: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "NL", dialCode: "+31", name: "Netherlands", flag: "🇳🇱" },
  { code: "FR", dialCode: "+33", name: "France", flag: "🇫🇷" },
  { code: "ES", dialCode: "+34", name: "Spain", flag: "🇪🇸" },
  { code: "IT", dialCode: "+39", name: "Italy", flag: "🇮🇹" },
  { code: "PL", dialCode: "+48", name: "Poland", flag: "🇵🇱" },
  { code: "UA", dialCode: "+380", name: "Ukraine", flag: "🇺🇦" },
  { code: "KZ", dialCode: "+7", name: "Kazakhstan", flag: "🇰🇿" },
  { code: "AZ", dialCode: "+994", name: "Azerbaijan", flag: "🇦🇿" },
  { code: "IQ", dialCode: "+964", name: "Iraq", flag: "🇮🇶" },
  { code: "KW", dialCode: "+965", name: "Kuwait", flag: "🇰🇼" },
  { code: "QA", dialCode: "+974", name: "Qatar", flag: "🇶🇦" },
  { code: "JO", dialCode: "+962", name: "Jordan", flag: "🇯🇴" },
  { code: "LY", dialCode: "+218", name: "Libya", flag: "🇱🇾" },
  { code: "NG", dialCode: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "EG", dialCode: "+20", name: "Egypt", flag: "🇪🇬" },
  { code: "MA", dialCode: "+212", name: "Morocco", flag: "🇲🇦" },
  { code: "SE", dialCode: "+46", name: "Sweden", flag: "🇸🇪" },
  { code: "NO", dialCode: "+47", name: "Norway", flag: "🇳🇴" },
  { code: "DK", dialCode: "+45", name: "Denmark", flag: "🇩🇰" },
  { code: "CH", dialCode: "+41", name: "Switzerland", flag: "🇨🇭" },
  { code: "AT", dialCode: "+43", name: "Austria", flag: "🇦🇹" },
  { code: "BE", dialCode: "+32", name: "Belgium", flag: "🇧🇪" },
  { code: "PT", dialCode: "+351", name: "Portugal", flag: "🇵🇹" },
  { code: "GR", dialCode: "+30", name: "Greece", flag: "🇬🇷" },
  { code: "RO", dialCode: "+40", name: "Romania", flag: "🇷🇴" },
  { code: "BG", dialCode: "+359", name: "Bulgaria", flag: "🇧🇬" },
  { code: "HU", dialCode: "+36", name: "Hungary", flag: "🇭🇺" },
  { code: "CZ", dialCode: "+420", name: "Czech Republic", flag: "🇨🇿" },
  { code: "SK", dialCode: "+421", name: "Slovakia", flag: "🇸🇰" },
  { code: "HR", dialCode: "+385", name: "Croatia", flag: "🇭🇷" },
  { code: "RS", dialCode: "+381", name: "Serbia", flag: "🇷🇸" },
  { code: "BA", dialCode: "+387", name: "Bosnia", flag: "🇧🇦" },
  { code: "AL", dialCode: "+355", name: "Albania", flag: "🇦🇱" },
  { code: "MK", dialCode: "+389", name: "N. Macedonia", flag: "🇲🇰" },
  { code: "CA", dialCode: "+1", name: "Canada", flag: "🇨🇦" },
  { code: "AU", dialCode: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "NZ", dialCode: "+64", name: "New Zealand", flag: "🇳🇿" },
  { code: "JP", dialCode: "+81", name: "Japan", flag: "🇯🇵" },
  { code: "KR", dialCode: "+82", name: "South Korea", flag: "🇰🇷" },
  { code: "CN", dialCode: "+86", name: "China", flag: "🇨🇳" },
  { code: "IN", dialCode: "+91", name: "India", flag: "🇮🇳" },
  { code: "PK", dialCode: "+92", name: "Pakistan", flag: "🇵🇰" },
];

export function formatPhoneAsYouType(value: string, countryCode: string): string {
  try {
    const formatter = new AsYouType(countryCode as any);
    return formatter.input(value);
  } catch {
    return value;
  }
}

export function toE164(localNumber: string, dialCode: string): string | null {
  const full = `${dialCode}${localNumber.replace(/\D/g, "")}`;
  try {
    if (isValidPhoneNumber(full)) {
      const parsed = parsePhoneNumber(full);
      return parsed.format("E.164");
    }
  } catch { }
  if (localNumber.replace(/\D/g, "").length >= 6) return full;
  return null;
}

export function getCountryByCode(code: string): CountryInfo {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}
