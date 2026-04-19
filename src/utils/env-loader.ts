import fs from "node:fs";
import path from "node:path";

const ENV_LOADER_FLAG = Symbol.for("scriptorium.env.loaded");

function parseEnvFile(content: string): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u);
    if (!match) continue;

    const [, key, rawValue] = match;
    let value = rawValue.trim();

    if (
      (value.startsWith("\"") && value.endsWith("\""))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t");
  }

  return entries;
}

export function loadScriptoriumEnv(projectRoot: string): string[] {
  const loaderState = globalThis as typeof globalThis & { [ENV_LOADER_FLAG]?: string[] };
  if (loaderState[ENV_LOADER_FLAG]) {
    return loaderState[ENV_LOADER_FLAG]!;
  }

  const loadedFiles: string[] = [];
  const explicitKeys = new Set(Object.keys(process.env));
  const candidates = [".env", ".env.local"];

  for (const filename of candidates) {
    const filePath = path.join(projectRoot, filename);
    if (!fs.existsSync(filePath)) continue;

    const parsed = parseEnvFile(fs.readFileSync(filePath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (explicitKeys.has(key)) continue;
      process.env[key] = value;
    }
    loadedFiles.push(filePath);
  }

  loaderState[ENV_LOADER_FLAG] = loadedFiles;
  return loadedFiles;
}
