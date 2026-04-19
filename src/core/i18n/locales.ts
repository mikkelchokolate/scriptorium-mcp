export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = ["en", "ru"] as const;

export type LocaleCode = string;
export type LocalizedTextMap = Partial<Record<string, string>>;

export const LOCALE_CODE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

export function isValidLocaleCode(locale: string): boolean {
  return LOCALE_CODE_PATTERN.test(locale.trim());
}

export function normalizeLocaleCode(locale?: string, fallback: LocaleCode = DEFAULT_LOCALE): LocaleCode {
  const normalized = locale?.trim();
  if (!normalized) return fallback;
  return isValidLocaleCode(normalized) ? normalized : fallback;
}

export function compactLocalizedTextMap(text?: LocalizedTextMap): Record<string, string> {
  if (!text) return {};

  return Object.fromEntries(
    Object.entries(text)
      .map(([locale, value]) => [locale, value?.trim()] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[0]) && Boolean(entry[1])),
  );
}

export function getLocaleFallbackOrder(locale: LocaleCode, availableLocales: Iterable<string> = []): LocaleCode[] {
  return Array.from(new Set([
    locale,
    locale.split("-")[0],
    DEFAULT_LOCALE,
    ...SUPPORTED_LOCALES,
    ...availableLocales,
  ].filter(Boolean)));
}

export function pickLocalizedText(
  text: LocalizedTextMap | undefined,
  locale: LocaleCode,
  fallbackValue: string,
): {
  value: string;
  valueLocale: LocaleCode;
  translations: Record<string, string>;
} {
  const translations = compactLocalizedTextMap(text);
  const candidates = getLocaleFallbackOrder(locale, Object.keys(translations));

  for (const candidate of candidates) {
    const value = translations[candidate];
    if (value) {
      return {
        value,
        valueLocale: candidate,
        translations,
      };
    }
  }

  return {
    value: fallbackValue,
    valueLocale: DEFAULT_LOCALE,
    translations: Object.keys(translations).length > 0
      ? translations
      : { [DEFAULT_LOCALE]: fallbackValue },
  };
}

export function localizedTextValues(text?: LocalizedTextMap): string[] {
  return Object.values(compactLocalizedTextMap(text));
}
