import {
  compactLocalizedTextMap,
  pickLocalizedText,
  type LocalizedTextMap,
} from "../../core/i18n/locales.js";
import { exactGraphTranslationMap, getGraphI18n } from "./i18n/index.js";
import type { GraphLocale, GraphResolvedText } from "./graph-dtos.js";
import { DEFAULT_GRAPH_LOCALE, SUPPORTED_GRAPH_LOCALES } from "./graph-utils.js";

function normalizeSpacing(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function buildTextMap(defaultValue: string, overrides: LocalizedTextMap = {}): Record<string, string> {
  return compactLocalizedTextMap({
    [DEFAULT_GRAPH_LOCALE]: defaultValue,
    ...overrides,
  });
}

function translateDynamic(value: string): Record<string, string> {
  const normalized = normalizeSpacing(value);
  const exact = exactGraphTranslationMap(normalized);
  if (exact) return buildTextMap(normalized, exact);

  const chapterMatch = normalized.match(/^Chapter\s+(\d+)$/i);
  if (chapterMatch) {
    return buildTextMap(`Chapter ${chapterMatch[1]}`, {
      ru: getGraphI18n("ru").chapter(chapterMatch[1]),
    });
  }

  const chapterShortMatch = normalized.match(/^Ch\.\s*(\d+)$/i);
  if (chapterShortMatch) {
    return buildTextMap(`Ch. ${chapterShortMatch[1]}`, {
      ru: getGraphI18n("ru").chapterShort(chapterShortMatch[1]),
    });
  }

  if (!normalized.includes("_")) {
    return buildTextMap(normalized);
  }

  const words = normalized.replace(/_/g, " ").split(" ");
  const defaultTranslation = normalized.replace(/_/g, " ");
  const translations = buildTextMap(defaultTranslation);

  for (const locale of SUPPORTED_GRAPH_LOCALES) {
    if (locale === DEFAULT_GRAPH_LOCALE) continue;
    const dictionary = getGraphI18n(locale);
    translations[locale] = words
      .map((word) => exactGraphTranslationMap(word)?.[locale] ?? dictionary.exact[word] ?? word.toLowerCase())
      .join(" ");
  }

  return translations;
}

export function resolveGraphText(locale: GraphLocale, values: LocalizedTextMap): GraphResolvedText {
  const translations = compactLocalizedTextMap(values);
  const fallbackValue = translations[DEFAULT_GRAPH_LOCALE] ?? Object.values(translations)[0] ?? "";
  const resolved = pickLocalizedText(translations, locale, fallbackValue);

  return {
    locale,
    value: resolved.value,
    fallbackLocale: resolved.valueLocale,
    translations: resolved.translations,
  };
}

export function resolveLocalizedGraphText(
  locale: GraphLocale,
  values: LocalizedTextMap | undefined,
  fallbackValue: string,
): GraphResolvedText {
  const fallback = translateDynamic(fallbackValue);
  return resolveGraphText(locale, {
    ...fallback,
    ...compactLocalizedTextMap(values),
  });
}

export function localizeGraphText(text: string, locale: GraphLocale): GraphResolvedText {
  return resolveGraphText(locale, translateDynamic(text));
}

export function localizeGraphString(text: string | undefined, locale: GraphLocale, fallbackValue: string): GraphResolvedText {
  const base = normalizeSpacing(text?.trim() || fallbackValue);
  return localizeGraphText(base, locale);
}
