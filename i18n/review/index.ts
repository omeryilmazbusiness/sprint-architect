import type { SupportedLocale, AppDict } from "../types";
import { reviewEnOverlay } from "./en";
import { reviewTrOverlay } from "./tr";
import type { ReviewOverlay } from "./types";

const overlays: Partial<Record<SupportedLocale, ReviewOverlay>> = {
  en: reviewEnOverlay,
  tr: reviewTrOverlay,
  ru: reviewEnOverlay,
  es: reviewEnOverlay,
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Deep-merge review overlay into base dictionary (strings replaced, objects merged). */
export function applyReviewOverlay(base: AppDict, locale: SupportedLocale): AppDict {
  const overlay = overlays[locale] ?? overlays.en;
  if (!overlay) return base;

  function merge<T>(target: T, patch: unknown): T {
    if (typeof patch === "string") return patch as T;
    if (!isPlainObject(target) || !isPlainObject(patch)) return target;
    const patchRec = patch as Record<string, unknown>;
    const out = { ...target } as Record<string, unknown>;
    for (const key of Object.keys(patchRec)) {
      const pv = patchRec[key];
      const tv = (target as Record<string, unknown>)[key];
      if (isPlainObject(tv) && isPlainObject(pv)) {
        out[key] = merge(tv, pv);
      } else if (pv !== undefined) {
        out[key] = pv;
      }
    }
    return out as T;
  }

  return merge(base, overlay);
}
