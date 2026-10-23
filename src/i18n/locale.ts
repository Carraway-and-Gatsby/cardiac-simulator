export const locales = ['en', 'ko'] as const;
export type Locale = typeof locales[number];
export const localeStorageKey = 'cardiolab.locale';

/** English is the explicit default, independent of the browser's language. */
export function resolveLocale(stored: string | null | undefined): Locale {
  return stored === 'ko' ? 'ko' : 'en';
}

export function translate(locale: Locale, english: string, korean: string): string {
  return locale === 'ko' ? korean : english;
}
