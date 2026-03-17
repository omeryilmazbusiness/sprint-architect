import type { ImageSourcePropType } from "react-native";

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
  logo: ImageSourcePropType;
  color: string;
  textColor: string;
  initial: string;
}

const BRAND_LOGOS: Record<VehicleBrandKey, ImageSourcePropType> = {
  MERCEDES:   require("../assets/brands/mercedes.png"),
  LEXUS:      require("../assets/brands/lexus.png"),
  VOLKSWAGEN: require("../assets/brands/volkswagen.png"),
  BMW:        require("../assets/brands/bmw.png"),
  AUDI:       require("../assets/brands/audi.png"),
  TOYOTA:     require("../assets/brands/toyota.png"),
  FORD:       require("../assets/brands/ford.png"),
};

export const VEHICLE_BRANDS: VehicleBrand[] = [
  { key: "MERCEDES",   label: "Mercedes",   logo: BRAND_LOGOS.MERCEDES,   color: "#1C1C1E", textColor: "#FFFFFF", initial: "M" },
  { key: "LEXUS",      label: "Lexus",      logo: BRAND_LOGOS.LEXUS,      color: "#8B6914", textColor: "#FFFFFF", initial: "L" },
  { key: "VOLKSWAGEN", label: "Volkswagen", logo: BRAND_LOGOS.VOLKSWAGEN, color: "#001F5B", textColor: "#FFFFFF", initial: "V" },
  { key: "BMW",        label: "BMW",        logo: BRAND_LOGOS.BMW,        color: "#0066CC", textColor: "#FFFFFF", initial: "B" },
  { key: "AUDI",       label: "Audi",       logo: BRAND_LOGOS.AUDI,       color: "#BB0A21", textColor: "#FFFFFF", initial: "A" },
  { key: "TOYOTA",     label: "Toyota",     logo: BRAND_LOGOS.TOYOTA,     color: "#EB0A1E", textColor: "#FFFFFF", initial: "T" },
  { key: "FORD",       label: "Ford",       logo: BRAND_LOGOS.FORD,       color: "#003087", textColor: "#FFFFFF", initial: "F" },
];

export const VEHICLE_BRAND_MAP: Record<VehicleBrandKey, VehicleBrand> = Object.fromEntries(
  VEHICLE_BRANDS.map((b) => [b.key, b])
) as Record<VehicleBrandKey, VehicleBrand>;

export function getBrand(key: string | null | undefined): VehicleBrand | null {
  if (!key) return null;
  return VEHICLE_BRAND_MAP[key as VehicleBrandKey] ?? null;
}
