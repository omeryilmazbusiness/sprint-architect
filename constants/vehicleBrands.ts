export type VehicleBrandKey =
  | "MERCEDES"
  | "LEXUS"
  | "VOLKSWAGEN"
  | "BMW"
  | "AUDI"
  | "TOYOTA"
  | "FORD";

export interface VehicleBrand {
  key: VehicleBrandKey;
  label: string;
  color: string;
  textColor: string;
  initial: string;
}

export const VEHICLE_BRANDS: VehicleBrand[] = [
  { key: "MERCEDES", label: "Mercedes", color: "#1C1C1E", textColor: "#FFFFFF", initial: "M" },
  { key: "LEXUS",    label: "Lexus",    color: "#8B6914", textColor: "#FFFFFF", initial: "L" },
  { key: "VOLKSWAGEN", label: "Volkswagen", color: "#001F5B", textColor: "#FFFFFF", initial: "V" },
  { key: "BMW",      label: "BMW",      color: "#0066CC", textColor: "#FFFFFF", initial: "B" },
  { key: "AUDI",     label: "Audi",     color: "#BB0A21", textColor: "#FFFFFF", initial: "A" },
  { key: "TOYOTA",   label: "Toyota",   color: "#EB0A1E", textColor: "#FFFFFF", initial: "T" },
  { key: "FORD",     label: "Ford",     color: "#003087", textColor: "#FFFFFF", initial: "F" },
];

export const VEHICLE_BRAND_MAP: Record<VehicleBrandKey, VehicleBrand> = Object.fromEntries(
  VEHICLE_BRANDS.map((b) => [b.key, b])
) as Record<VehicleBrandKey, VehicleBrand>;

export function getBrand(key: string | null | undefined): VehicleBrand | null {
  if (!key) return null;
  return VEHICLE_BRAND_MAP[key as VehicleBrandKey] ?? null;
}
