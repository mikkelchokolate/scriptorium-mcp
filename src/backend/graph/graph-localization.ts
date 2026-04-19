import {
  compactLocalizedTextMap,
  pickLocalizedText,
  type LocalizedTextMap,
} from "../../core/i18n/locales.js";
import type { GraphLocale, GraphResolvedText } from "./graph-dtos.js";
import { DEFAULT_GRAPH_LOCALE, SUPPORTED_GRAPH_LOCALES } from "./graph-utils.js";

const EXACT_TRANSLATIONS: Record<string, LocalizedTextMap> = {
  "World Bible": { en: "World Bible", ru: "Библия мира" },
  Outline: { en: "Outline", ru: "План" },
  "Project overview": { en: "Project overview", ru: "Обзор проекта" },
  project: { en: "project", ru: "проект" },
  character: { en: "character", ru: "персонаж" },
  "lore fact": { en: "lore fact", ru: "факт лора" },
  "Lore fact": { en: "Lore fact", ru: "Факт лора" },
  chapter: { en: "chapter", ru: "глава" },
  event: { en: "event", ru: "событие" },
  entity: { en: "entity", ru: "сущность" },
  contains: { en: "contains", ru: "содержит" },
  mentions: { en: "mentions", ru: "упоминает" },
  affects: { en: "affects", ru: "влияет на" },
  triggers: { en: "triggers", ru: "запускает" },
  anchors: { en: "anchors", ru: "привязывает" },
  canonical: { en: "canonical", ru: "канонический" },
  neo4j: { en: "neo4j", ru: "neo4j" },
  derived: { en: "derived", ru: "производный" },
  "story time": { en: "story time", ru: "время истории" },
  "publication time": { en: "publication time", ru: "время публикации" },
  Location: { en: "Location", ru: "Локация" },
  Character: { en: "Character", ru: "Персонаж" },
  timeline: { en: "timeline", ru: "таймлайн" },
};

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
  const exact = EXACT_TRANSLATIONS[normalized];
  if (exact) return buildTextMap(normalized, exact);

  const chapterMatch = normalized.match(/^Chapter\s+(\d+)$/i);
  if (chapterMatch) {
    return buildTextMap(`Chapter ${chapterMatch[1]}`, { ru: `Глава ${chapterMatch[1]}` });
  }

  const chapterShortMatch = normalized.match(/^Ch\.\s*(\d+)$/i);
  if (chapterShortMatch) {
    return buildTextMap(`Ch. ${chapterShortMatch[1]}`, { ru: `Гл. ${chapterShortMatch[1]}` });
  }

  if (!normalized.includes("_")) {
    return buildTextMap(normalized);
  }

  const words = normalized.replace(/_/g, " ").split(" ");
  const defaultTranslation = normalized.replace(/_/g, " ");
  const translations = buildTextMap(defaultTranslation);

  for (const locale of SUPPORTED_GRAPH_LOCALES) {
    if (locale === DEFAULT_GRAPH_LOCALE) continue;
    translations[locale] = words
      .map((word) => EXACT_TRANSLATIONS[word]?.[locale] ?? word.toLowerCase())
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
