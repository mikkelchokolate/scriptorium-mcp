import type { LocalizedTextMap } from "../../../core/i18n/locales.js";
import { normalizeLocaleCode } from "../../../core/i18n/locales.js";
import { graphI18nEn } from "./en.js";
import { graphI18nRu } from "./ru.js";
import type { GraphI18nMessages } from "./types.js";

const GRAPH_I18N = {
  en: graphI18nEn,
  ru: graphI18nRu,
} as const satisfies Record<string, GraphI18nMessages>;

type GraphI18nLocale = keyof typeof GRAPH_I18N;

export function getGraphI18n(locale?: string): GraphI18nMessages {
  const normalized = normalizeLocaleCode(locale, "en");
  const direct = GRAPH_I18N[normalized as GraphI18nLocale];
  if (direct) return direct;

  const base = normalized.split("-")[0];
  return GRAPH_I18N[base as GraphI18nLocale] ?? GRAPH_I18N.en;
}

export function graphMessageMap(selector: (messages: GraphI18nMessages) => string): LocalizedTextMap {
  return Object.fromEntries(
    Object.entries(GRAPH_I18N).map(([locale, messages]) => [locale, selector(messages)]),
  );
}

export function exactGraphTranslationMap(value: string): LocalizedTextMap | undefined {
  const entries = Object.entries(GRAPH_I18N)
    .map(([locale, messages]) => [locale, messages.exact[value]] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));

  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}
