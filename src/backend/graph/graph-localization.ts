import type { GraphLocale, GraphResolvedText } from "./graph-dtos.js";

const EXACT_TRANSLATIONS: Record<string, { en: string; ru: string }> = {
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

export function otherGraphLocale(locale: GraphLocale): GraphLocale {
  return locale === "en" ? "ru" : "en";
}

function normalizeSpacing(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function translateDynamic(value: string): { en: string; ru: string } {
  const normalized = normalizeSpacing(value);
  const exact = EXACT_TRANSLATIONS[normalized];
  if (exact) return exact;

  const chapterMatch = normalized.match(/^Chapter\s+(\d+)$/i);
  if (chapterMatch) {
    return { en: `Chapter ${chapterMatch[1]}`, ru: `Глава ${chapterMatch[1]}` };
  }

  const chapterShortMatch = normalized.match(/^Ch\.\s*(\d+)$/i);
  if (chapterShortMatch) {
    return { en: `Ch. ${chapterShortMatch[1]}`, ru: `Гл. ${chapterShortMatch[1]}` };
  }

  if (!normalized.includes("_")) {
    return { en: normalized, ru: normalized };
  }

  const words = normalized.replace(/_/g, " ").split(" ");
  const translatedWords = words.map((word) => EXACT_TRANSLATIONS[word]?.ru ?? word.toLowerCase());
  const en = normalized.replace(/_/g, " ");
  const ru = translatedWords.join(" ");
  return { en, ru };
}

export function resolveGraphText(locale: GraphLocale, values: { en: string; ru: string }): GraphResolvedText {
  return {
    en: values.en,
    ru: values.ru,
    locale,
    value: locale === "ru" ? values.ru : values.en,
    fallbackLocale: otherGraphLocale(locale),
  };
}

export function localizeGraphText(text: string, locale: GraphLocale): GraphResolvedText {
  return resolveGraphText(locale, translateDynamic(text));
}

export function localizeGraphString(text: string | undefined, locale: GraphLocale, fallbackValue: string): GraphResolvedText {
  const base = normalizeSpacing(text?.trim() || fallbackValue);
  return localizeGraphText(base, locale);
}
