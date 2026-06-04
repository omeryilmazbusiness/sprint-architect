import { dictionaries } from "@/i18n";
import { applyReviewOverlay } from "@/i18n/review";
import { useLanguage } from "@/context/LanguageContext";
import { isReviewMode } from "@/lib/isReviewMode";
import type { AppDict } from "@/i18n";

/**
 * Returns the full typed translation dictionary for the current locale.
 *
 * Usage:
 *   const t = useT();
 *   <Text>{t.adminDashboard.pageTitle}</Text>
 *
 * To localize a new page, add its section to AppDict in i18n/types.ts,
 * add translations to i18n/en.ts and i18n/ru.ts, then consume via useT().
 */
export function useT(): AppDict {
  const { locale } = useLanguage();
  const base = dictionaries[locale];
  return isReviewMode() ? applyReviewOverlay(base, locale) : base;
}
