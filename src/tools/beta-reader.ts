import { z } from "zod";

import { getMcpMessages } from "../core/i18n/mcp/index.js";
import { SERVER_LOCALE, resolveRequestLocale, withLocaleInput } from "../core/i18n/runtime.js";

const PERSONA_VALUES = [
  "harsh_critic",
  "genre_fan",
  "casual_reader",
  "literary_snob",
  "teen_reader",
  "sensitivity_reader",
  "editor",
  "superfan",
] as const;

const serverMessages = getMcpMessages(SERVER_LOCALE);

const betaReaderSchemaBase = z.object({
  action: z.enum(["simulate", "list_personas"]).describe(serverMessages.betaReader.schema.action),
  project: z.string().describe(serverMessages.betaReader.schema.project),
  text: z.string().optional().describe(serverMessages.betaReader.schema.text),
  chapter_number: z.number().optional().describe(serverMessages.betaReader.schema.chapterNumber),
  personas: z.array(z.enum(PERSONA_VALUES)).optional().describe(serverMessages.betaReader.schema.personas),
  genre: z.string().optional().describe(serverMessages.betaReader.schema.genre),
});

export const betaReaderSchema = withLocaleInput(betaReaderSchemaBase);
export type BetaReaderInput = z.infer<typeof betaReaderSchema>;

export async function betaReader(input: BetaReaderInput): Promise<string> {
  const locale = resolveRequestLocale(input);
  const messages = getMcpMessages(locale).betaReader;

  if (input.action === "list_personas") {
    const lines = Object.entries(messages.personas).map(([key, persona]) =>
      `**${persona.name}** (\`${key}\`)\n  ${persona.description}\n  ${locale.startsWith("ru") ? "Фокус" : "Focus"}: ${persona.focus.join(", ")}`,
    );
    return messages.listPersonasTitle(lines.join("\n\n"));
  }

  if (input.action === "simulate") {
    if (!input.text) return messages.simulateTextRequired;
    const selectedPersonas = input.personas ?? ["harsh_critic", "genre_fan", "casual_reader"];
    const chapterRef = input.chapter_number
      ? locale.startsWith("ru")
        ? ` (Глава ${input.chapter_number})`
        : ` (Chapter ${input.chapter_number})`
      : "";
    const genre = input.genre ? ` [${input.genre}]` : "";

    const personaInstructions = selectedPersonas.map((key) => {
      const persona = messages.personas[key];
      return `### ${persona.name}${genre}
**${locale.startsWith("ru") ? "Перспектива" : "Perspective"}:** ${persona.description}
**${locale.startsWith("ru") ? "Зоны внимания" : "Focus areas"}:** ${persona.focus.join(", ")}
${locale.startsWith("ru")
  ? "Дай 3-5 конкретных и применимых замечаний из перспективы этой персоны. Сохраняй её голос и приоритеты."
  : "Provide 3-5 specific, actionable feedback points from this persona's perspective. Stay authentic to their voice and priorities."}`;
    }).join("\n\n");

    const excerpt = `${input.text.slice(0, 500)}${input.text.length > 500 ? "\n...[truncated]" : ""}`;
    return messages.simulationHeading(chapterRef, excerpt, personaInstructions);
  }

  return messages.unknownAction;
}
