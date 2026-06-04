import type { AppDict } from "../types";

/** Recursive partial for review copy overlays (nested sections may omit keys). */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

export type ReviewOverlay = DeepPartial<AppDict>;
