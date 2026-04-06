import { dictionaries } from "@/i18n";
import { useLanguage } from "@/context/LanguageContext";
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
  return dictionaries[locale];
}
