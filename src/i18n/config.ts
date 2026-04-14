/**
 * Configuración de i18n — 3 idiomas: inglés, español, holandés.
 */

export const LOCALES = ['en', 'es', 'nl'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'es'

export const LOCALE_NAMES: Record<Locale, { name: string; flag: string; shortCode: string }> = {
  en: { name: 'English', flag: '🇬🇧', shortCode: 'EN' },
  es: { name: 'Español', flag: '🇪🇸', shortCode: 'ES' },
  nl: { name: 'Nederlands', flag: '🇳🇱', shortCode: 'NL' },
}

export const COOKIE_NAME = 'cbi-locale'

export function isValidLocale(v: string | undefined | null): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v)
}
