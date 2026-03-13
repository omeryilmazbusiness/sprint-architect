export const SERVICES = [
  { code: "RINOPLASTY", label: "Rinoplasti" },
  { code: "EYE", label: "Göz" },
  { code: "DENTAL", label: "Diş" },
] as const;

export type ServiceCode = (typeof SERVICES)[number]["code"];

export function serviceLabel(code: string): string {
  return SERVICES.find((s) => s.code === code)?.label ?? code;
}
