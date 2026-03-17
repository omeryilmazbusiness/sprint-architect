import React from "react";
import { VehicleBrandLogo } from "@/components/brands/VehicleBrandLogo";

interface BrandBadgeProps {
  brand: string | null | undefined;
  size?: number;
}

export function BrandBadge({ brand, size = 44 }: BrandBadgeProps) {
  return <VehicleBrandLogo brand={brand} size={size} />;
}
