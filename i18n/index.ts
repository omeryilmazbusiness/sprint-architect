import type { SupportedLocale, AppDict } from "./types";
import { en } from "./en";
import { ru } from "./ru";
import { tr } from "./tr";

export type { SupportedLocale, AppDict };
export { LOCALE_LABELS, LOCALE_FLAGS } from "./types";

export const dictionaries: Record<SupportedLocale, AppDict> = { en, ru, tr };
