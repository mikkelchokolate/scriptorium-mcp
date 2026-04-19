import { z } from "zod";
import fs from "fs-extra";
import path from "path";

import { getMcpMessages } from "../core/i18n/mcp/index.js";
import { SERVER_LOCALE, resolveRequestLocale, withLocaleInput } from "../core/i18n/runtime.js";

const DOMAIN_VALUES = ["history", "science", "geography", "culture", "technology", "medicine", "military", "mythology", "general"] as const;
const serverMessages = getMcpMessages(SERVER_LOCALE);

const researchQuillSchemaBase = z.object({
  action: z.enum(["research", "fact_check", "add_source", "list_sources"]).describe(serverMessages.researchQuill.schema.action),
  project: z.string().describe(serverMessages.researchQuill.schema.project),
  query: z.string().optional().describe(serverMessages.researchQuill.schema.query),
  context: z.string().optional().describe(serverMessages.researchQuill.schema.context),
  period: z.string().optional().describe(serverMessages.researchQuill.schema.period),
  domain: z.enum(DOMAIN_VALUES).optional().describe(serverMessages.researchQuill.schema.domain),
  claim: z.string().optional().describe(serverMessages.researchQuill.schema.claim),
  source: z.object({
    title: z.string(),
    author: z.string().optional(),
    url: z.string().optional(),
    notes: z.string().optional(),
  }).optional().describe(serverMessages.researchQuill.schema.source),
});

export const researchQuillSchema = withLocaleInput(researchQuillSchemaBase);
export type ResearchQuillInput = z.infer<typeof researchQuillSchema>;

export async function researchQuill(input: ResearchQuillInput, projectsRoot: string): Promise<string> {
  const locale = resolveRequestLocale(input);
  const messages = getMcpMessages(locale).researchQuill;
  const projectDir = path.join(projectsRoot, input.project);
  await fs.ensureDir(projectDir);
  const sourcesPath = path.join(projectDir, "bibliography.json");

  let sources: any[] = [];
  if (await fs.pathExists(sourcesPath)) {
    sources = await fs.readJson(sourcesPath);
  }

  if (input.action === "add_source") {
    if (!input.source) return messages.sourceRequired;
    sources.push({ ...input.source, added: new Date().toISOString() });
    await fs.writeJson(sourcesPath, sources, { spaces: 2 });
    return messages.sourceAdded(input.source.title, input.source.author);
  }

  if (input.action === "list_sources") {
    if (sources.length === 0) return messages.noSources;
    const lines = sources.map((source: any, index: number) =>
      `  ${index + 1}. "${source.title}"${source.author ? ` - ${source.author}` : ""}${source.url ? `\n     URL: ${source.url}` : ""}${source.notes ? `\n     ${locale.startsWith("ru") ? "Заметки" : "Notes"}: ${source.notes}` : ""}`,
    );
    return messages.bibliographyTitle(input.project, sources.length, lines.join("\n\n"));
  }

  if (input.action === "research") {
    if (!input.query) return messages.researchQueryRequired;
    return messages.researchRequest({
      query: input.query,
      domain: input.domain ?? "general",
      period: input.period,
      context: input.context,
    });
  }

  if (input.action === "fact_check") {
    if (!input.claim) return messages.factCheckClaimRequired;
    return messages.factCheckRequest({
      claim: input.claim,
      domain: input.domain ?? "general",
      context: input.context,
    });
  }

  return messages.unknownAction;
}
