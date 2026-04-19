export const DEFAULT_GRAPH_LOCALE = "en";
export const SUPPORTED_GRAPH_LOCALES = ["en", "ru"] as const;
export const MAX_FORECAST_HORIZON = 10;

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
