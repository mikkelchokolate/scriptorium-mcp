import fs from "fs-extra";
import path from "path";

import { DEFAULT_LOCALE, type LocaleCode } from "../core/i18n/locales.js";
import { getMcpMessages } from "../core/i18n/mcp/index.js";
import { resolveRequestLocale, t, type LocalizedEntry, type MessageParams } from "../core/i18n/runtime.js";

type ErrorSuggestion = string | LocalizedEntry;

/**
 * Scriptorium centralized error handling and logging.
 *
 * All MCP tools pass through withErrorHandling so validation, logging, and
 * end-user responses stay consistent across locales.
 */

export class ScriptoriumError extends Error {
  public readonly localizedMessage?: LocalizedEntry;
  public readonly suggestions: string[];
  public readonly messageParams: MessageParams;
  private readonly suggestionEntries: ErrorSuggestion[];

  constructor(
    message: string | LocalizedEntry,
    public code: string = "SCRIPTORIUM_ERROR",
    suggestions: ErrorSuggestion[] = [],
    public context?: Record<string, any>,
    params: MessageParams = {},
  ) {
    const localizedMessage = typeof message === "string" ? undefined : message;
    const englishMessage = typeof message === "string" ? message : t(DEFAULT_LOCALE, message, params);

    super(englishMessage);
    this.name = "ScriptoriumError";
    this.localizedMessage = localizedMessage;
    this.messageParams = params;
    this.suggestionEntries = suggestions;
    this.suggestions = suggestions.map((entry) => typeof entry === "string" ? entry : t(DEFAULT_LOCALE, entry, params));
  }

  public resolveMessage(locale: LocaleCode): string {
    return this.localizedMessage ? t(locale, this.localizedMessage, this.messageParams) : this.message;
  }

  public resolveSuggestions(locale: LocaleCode): string[] {
    return this.suggestionEntries.map((entry) => typeof entry === "string" ? entry : t(locale, entry, this.messageParams));
  }
}

export interface OperationLog {
  timestamp: string;
  tool: string;
  action: string;
  project?: string;
  durationMs?: number;
  status: "success" | "error";
  details?: string;
}

const LOG_FILE = path.join(process.cwd(), "scriptorium-audit.log");

export function logOperation(tool: string, action: string, details: Record<string, any> = {}): void {
  const entry: OperationLog = {
    timestamp: new Date().toISOString(),
    tool,
    action,
    status: "success",
    ...details,
  };

  const logLine = `[${entry.timestamp}] ${tool.toUpperCase()} | ${action} | ${JSON.stringify(details)}\n`;

  console.error(logLine.trim());
  fs.appendFile(LOG_FILE, logLine, "utf-8").catch(() => {});
}

export function withErrorHandling<T extends (...args: any[]) => Promise<string>>(
  fn: T,
  toolName: string,
): T {
  return (async (...args: Parameters<T>): Promise<string> => {
    const start = Date.now();
    const [input] = args;
    const locale = resolveRequestLocale(input as { locale?: string } | undefined);
    const messages = getMcpMessages(locale);

    try {
      if (input && typeof input === "object" && "project" in input) {
        const project = input.project as string;
        if (!/^[a-zA-Z0-9_-]+$/.test(project)) {
          throw new ScriptoriumError(
            messages.errorHandler.invalidProjectName,
            "VALIDATION_ERROR",
            [messages.errorHandler.invalidProjectNameSuggestion],
          );
        }
      }

      const result = await fn(...args);
      const duration = Date.now() - start;
      logOperation(toolName, input?.action || "unknown", {
        project: input?.project,
        durationMs: duration,
        status: "success",
      });
      return result;
    } catch (err: unknown) {
      const error = err instanceof ScriptoriumError
        ? err
        : new ScriptoriumError(
          err instanceof Error ? err.message : "Unknown error in Scriptorium.",
          "INTERNAL_ERROR",
          [
            messages.errorHandler.inspectProjectSuggestion,
            messages.errorHandler.verifyFactsSuggestion,
            messages.errorHandler.inspectWorldBibleSuggestion,
          ],
        );

      const duration = Date.now() - start;
      logOperation(toolName, input?.action || "unknown", {
        project: input?.project,
        durationMs: duration,
        status: "error",
        error: error.message,
        code: error.code,
      });

      const message = error.resolveMessage(locale);
      const suggestions = error.resolveSuggestions(locale);
      let response = messages.errorHandler.responseHeading({ code: error.code, message });

      if (suggestions.length > 0) {
        response += `\n\n${messages.errorHandler.suggestionsHeading}\n${suggestions.map((suggestion) => `- ${suggestion}`).join("\n")}`;
      }

      response += `\n\n${messages.errorHandler.auditTrailFooter}`;

      return response;
    }
  }) as T;
}

fs.ensureDir(path.dirname(LOG_FILE)).then(() => {
  logOperation("error_handler", "initialized", { version: "locale-aware" });
}).catch(() => {});
