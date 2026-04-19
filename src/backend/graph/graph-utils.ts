import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getLocaleFallbackOrder,
  normalizeLocaleCode,
} from "../../core/i18n/locales.js";
import type { GraphLocale } from "./graph-dtos.js";

export const DEFAULT_GRAPH_LOCALE: GraphLocale = DEFAULT_LOCALE;
export const SUPPORTED_GRAPH_LOCALES: GraphLocale[] = [...SUPPORTED_LOCALES];
export const MAX_FORECAST_HORIZON = 10;

export function normalizeGraphLocale(locale?: string): GraphLocale {
  const normalized = normalizeLocaleCode(locale, DEFAULT_GRAPH_LOCALE);
  const candidates = getLocaleFallbackOrder(normalized, SUPPORTED_GRAPH_LOCALES);
  return candidates.find((candidate) => SUPPORTED_GRAPH_LOCALES.includes(candidate)) ?? DEFAULT_GRAPH_LOCALE;
}

export function slugifyGraphId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "item";
}

export function clampForecastHorizon(value?: number): number {
  if (!Number.isFinite(value)) return MAX_FORECAST_HORIZON;
  const numeric = Math.trunc(value ?? MAX_FORECAST_HORIZON);
  return Math.min(MAX_FORECAST_HORIZON, Math.max(1, numeric));
}

export function uniqueNumbers(values: Array<number | undefined | null>): number[] {
  return Array.from(new Set(values.filter((value): value is number => typeof value === "number" && Number.isFinite(value)))).sort((left, right) => left - right);
}
