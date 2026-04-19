import { GRAPH_HTTP_URL, GRAPH_WS_URL } from "@/lib/config";
import type { AppLocale } from "@/lib/i18n";

export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${GRAPH_HTTP_URL}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

export function createGraphSocket(project: string, locale: AppLocale): WebSocket {
  return new WebSocket(`${GRAPH_WS_URL}/ws/projects/${encodeURIComponent(project)}/graph?locale=${locale}`);
}
