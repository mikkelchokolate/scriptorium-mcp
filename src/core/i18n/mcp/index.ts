import { DEFAULT_LOCALE, normalizeLocaleCode } from "../locales.js";
import { mcpMessagesEn } from "./en.js";
import { mcpMessagesRu } from "./ru.js";
import type { McpLocaleMessages } from "./types.js";

const MCP_DICTIONARIES = {
  en: mcpMessagesEn,
  ru: mcpMessagesRu,
} as const satisfies Record<string, McpLocaleMessages>;

export type McpCatalogLocale = keyof typeof MCP_DICTIONARIES;

export function getMcpMessages(locale?: string): McpLocaleMessages {
  const normalized = normalizeLocaleCode(locale, DEFAULT_LOCALE);
  const direct = MCP_DICTIONARIES[normalized as McpCatalogLocale];
  if (direct) return direct;

  const base = normalized.split("-")[0];
  return MCP_DICTIONARIES[base as McpCatalogLocale] ?? MCP_DICTIONARIES.en;
}

export function mcpEntry(selector: (messages: McpLocaleMessages) => string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(MCP_DICTIONARIES).map(([locale, messages]) => [locale, selector(messages)]),
  );
}
