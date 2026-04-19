import { normalizeLocaleCode } from "../core/i18n/locales.js";
import { genrePromptMetaEn, genrePromptsEn } from "./genres/en.js";
import { genrePromptMetaRu, genrePromptsRu } from "./genres/ru.js";
import type { GenrePromptCatalog, GenrePromptDefinition, GenrePromptLocaleMeta } from "./genres/types.js";

const GENRE_PROMPT_CATALOGS = {
  en: genrePromptsEn,
  ru: genrePromptsRu,
} as const satisfies Record<string, GenrePromptCatalog>;

export const GENRE_PROMPTS = genrePromptsEn;
type GenrePromptLocale = keyof typeof GENRE_PROMPT_CATALOGS;
const GENRE_PROMPT_META: Record<GenrePromptLocale, GenrePromptLocaleMeta> = {
  en: genrePromptMetaEn,
  ru: genrePromptMetaRu,
};

function getGenreCatalog(locale?: string): GenrePromptCatalog {
  const normalized = normalizeLocaleCode(locale, "en");
  const direct = GENRE_PROMPT_CATALOGS[normalized as GenrePromptLocale];
  if (direct) return direct;

  const base = normalized.split("-")[0];
  return GENRE_PROMPT_CATALOGS[base as GenrePromptLocale] ?? GENRE_PROMPT_CATALOGS.en;
}

function getGenreMeta(locale?: string): GenrePromptLocaleMeta {
  const normalized = normalizeLocaleCode(locale, "en");
  return GENRE_PROMPT_META[normalized as GenrePromptLocale]
    ?? GENRE_PROMPT_META[normalized.split("-")[0] as GenrePromptLocale]
    ?? GENRE_PROMPT_META.en;
}

export function getGenreGuide(genre: string, locale?: string): GenrePromptDefinition | undefined {
  return getGenreCatalog(locale)[genre];
}

export function getGenrePrompt(genre: string, locale?: string): string {
  const catalog = getGenreCatalog(locale);
  const meta = getGenreMeta(locale);
  const guide = catalog[genre];
  if (!guide) {
    const available = Object.keys(catalog).join(", ");
    return meta.genreNotFound(genre, available);
  }

  return `# ${guide.name} - ${meta.expertPrompt}\n\n## ${meta.systemPromptLabel}\n${guide.systemPrompt}\n\n## ${meta.tropesLabel}\n${guide.tropes.map((item) => `- ${item}`).join("\n")}\n\n## ${meta.avoidLabel}\n${guide.avoid.map((item) => `- ${item}`).join("\n")}`;
}

export function listGenres(locale?: string): string {
  const catalog = getGenreCatalog(locale);
  const meta = getGenreMeta(locale);
  const lines = Object.entries(catalog).map(([key, guide]) => `  - \`${key}\` - ${guide.name}`);
  return `${meta.availablePromptsTitle}:\n${lines.join("\n")}`;
}
