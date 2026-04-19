import { z } from "zod";

import { getMcpMessages } from "./mcp/index.js";
import {
  DEFAULT_LOCALE,
  LOCALE_CODE_PATTERN,
  normalizeLocaleCode,
  pickLocalizedText,
  type LocaleCode,
  type LocalizedTextMap,
} from "./locales.js";

type PrimitiveParam = string | number | boolean | null | undefined;
export type MessageParams = Record<string, PrimitiveParam>;
export type LocalizedEntry<TParams extends MessageParams = MessageParams> =
  | LocalizedTextMap
  | ((params: TParams) => LocalizedTextMap);

export const SERVER_LOCALE = normalizeLocaleCode(process.env.SCRIPTORIUM_LOCALE, DEFAULT_LOCALE);
const runtimeMessages = getMcpMessages(SERVER_LOCALE).runtime;

function interpolate(template: string, params: MessageParams = {}): string {
  return Object.entries(params).reduce((result, [key, value]) => {
    return result.replaceAll(`{{${key}}}`, value === undefined || value === null ? "" : String(value));
  }, template);
}

function entryToMap<TParams extends MessageParams>(entry: LocalizedEntry<TParams>, params: TParams): LocalizedTextMap {
  return typeof entry === "function" ? entry(params) : entry;
}

export function t<TParams extends MessageParams = MessageParams>(
  locale: LocaleCode,
  entry: LocalizedEntry<TParams>,
  params?: TParams,
): string {
  const resolvedParams = (params ?? {}) as TParams;
  const map = entryToMap(entry, resolvedParams);
  const fallbackValue = map[DEFAULT_LOCALE] ?? Object.values(map)[0] ?? "";
  const resolved = pickLocalizedText(map, locale, fallbackValue);
  return interpolate(resolved.value, resolvedParams);
}

export function serverT<TParams extends MessageParams = MessageParams>(
  entry: LocalizedEntry<TParams>,
  params?: TParams,
): string {
  return t(SERVER_LOCALE, entry, params);
}

export const localeInputField = z
  .string()
  .regex(LOCALE_CODE_PATTERN, runtimeMessages.localeFieldError)
  .optional()
  .describe(runtimeMessages.localeFieldDescription);

export function withLocaleInput<TShape extends z.ZodRawShape>(schema: z.ZodObject<TShape>) {
  return schema.extend({
    locale: localeInputField,
  });
}

export function resolveRequestLocale(input?: { locale?: string }): LocaleCode {
  return normalizeLocaleCode(input?.locale, SERVER_LOCALE);
}
