import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { localeStorageKey, resolveLocale, translate, type Locale } from './i18n/locale';
export type { Locale } from './i18n/locale';
export type Translate = (english: string, korean: string) => string;

type LanguageContext = { locale: Locale; setLocale: (locale: Locale) => void; t: Translate };
const I18nContext = createContext<LanguageContext | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    try { return resolveLocale(window.localStorage.getItem(localeStorageKey)); }
    catch { return 'en'; }
  });
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = locale === 'en' ? 'CardioLab · Cardiovascular Physiology Lab' : 'CardioLab · 심혈관 생리 실험실';
    try { window.localStorage.setItem(localeStorageKey, locale); } catch { /* Storage may be disabled. Switching still works. */ }
  }, [locale]);
  const t = useCallback<Translate>((english, korean) => translate(locale, english, korean), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): LanguageContext {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n requires LanguageProvider.');
  return context;
}
