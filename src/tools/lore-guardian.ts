import { z } from "zod";

import { makeProvenance } from "../core/domain/entities.js";
import type {
  CausalMetadata,
  LoreFact,
  LoreFactLocalization,
  ProvenanceSource,
  TemporalMetadata,
} from "../core/domain/entities.js";
import { LOCALE_CODE_PATTERN } from "../core/i18n/locales.js";
import { getMcpMessages, mcpEntry } from "../core/i18n/mcp/index.js";
import { SERVER_LOCALE, resolveRequestLocale, withLocaleInput } from "../core/i18n/runtime.js";
import { createProjectService } from "../services/project-service.js";
import loreService from "../services/lore-service.js";
import eventBus from "../utils/event-bus.js";
import { withErrorHandling, ScriptoriumError, logOperation } from "../utils/error-handler.js";

const factCategories = [
  "character",
  "location",
  "lore",
  "timeline",
  "magic",
  "technology",
  "historical_accuracy",
  "thematic_coherence",
  "psychological_consistency",
  "mystery_logic",
  "romantic_tension",
  "other",
] as const;

const serverMessages = getMcpMessages(SERVER_LOCALE).loreGuardian;

const localizedTextSchema = z.record(
  z.string().regex(LOCALE_CODE_PATTERN, serverMessages.schema.localeKeyError),
  z.string().min(1).max(500),
).refine((value) => Object.keys(value).length > 0, {
  message: serverMessages.schema.localizedValueRequired,
});

const temporalMetadataSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  duration: z.string().optional(),
  temporalPrecision: z.enum(["exact", "approximate", "inferred", "unknown"]).optional(),
  timelineAxis: z.enum(["story_time", "narration_time", "publication_time"]).optional(),
  chapterSpanStart: z.number().int().positive().optional(),
  chapterSpanEnd: z.number().int().positive().optional(),
});

const causalMetadataSchema = z.object({
  causeConfidence: z.number().min(0).max(1).optional(),
  causalPolarity: z.enum(["enables", "blocks", "triggers", "explains"]).optional(),
  causalDistance: z.number().int().nonnegative().optional(),
  evidenceSource: z.string().max(500).optional(),
  forecastHorizonChapters: z.number().int().positive().max(10).optional(),
});

const loreFactInputSchema = z.object({
  category: z.enum(factCategories),
  key: z.string().min(1).max(100),
  value: z.string().min(1).max(500),
  chapter: z.number().int().positive().optional(),
  localized: z.object({
    key: localizedTextSchema.optional(),
    value: localizedTextSchema.optional(),
  }).optional(),
  temporal: temporalMetadataSchema.optional(),
  causal: causalMetadataSchema.optional(),
  aliases: z.array(z.string().min(1).max(100)).optional(),
  observations: z.array(z.string().min(1).max(500)).optional(),
});

const loreGuardianSchemaBase = z.object({
  action: z.enum(["check_consistency", "add_fact", "list_facts", "check_timeline"]).describe(serverMessages.schema.action),
  project: z.string().describe(serverMessages.schema.project).regex(/^[a-zA-Z0-9_-]+$/).describe(serverMessages.schema.projectSanitized),
  text: z.string().optional().describe(serverMessages.schema.text),
  fact: loreFactInputSchema.optional().describe(serverMessages.schema.fact),
  category: z.enum(factCategories).optional().describe(serverMessages.schema.category),
});

export const loreGuardianSchema = withLocaleInput(loreGuardianSchemaBase);
export type LoreGuardianInput = z.infer<typeof loreGuardianSchema>;

interface EntityMention {
  name: string;
  type: "character" | "location";
  mentions: number;
}

function categoryToEntityType(category: string): string {
  switch (category) {
    case "character":
      return "Character";
    case "location":
      return "Location";
    case "timeline":
      return "Event";
    default:
      return category
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");
  }
}

function toLoreFact(input: NonNullable<LoreGuardianInput["fact"]>): LoreFact {
  const localized: LoreFactLocalization | undefined = input.localized
    ? {
      key: input.localized.key,
      value: input.localized.value,
    }
    : undefined;

  return {
    category: input.category,
    key: input.key,
    value: input.value,
    chapter: input.chapter,
    localized,
    temporal: input.temporal as TemporalMetadata | undefined,
    causal: input.causal as CausalMetadata | undefined,
    added: new Date().toISOString(),
    confidence: input.causal?.causeConfidence ?? 0.9,
    source: "manual" satisfies ProvenanceSource,
  };
}

function extractEntities(text: string): EntityMention[] {
  const entities: EntityMention[] = [];
  const nameRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const locationRegex = /\b(?:the |in |at |from )?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s(?:Kingdom|Empire|City|Forest|Mountain|River|Castle))\b/g;
  const nameMatches = text.match(nameRegex) ?? [];
  const locationMatches = Array.from(text.matchAll(locationRegex), (match) => match[1]);
  const names = Array.from(new Set([...nameMatches, ...locationMatches]));

  for (const name of names) {
    const mentions = (text.match(new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g")) ?? []).length;
    entities.push({
      name,
      type: locationMatches.includes(name) ? "location" : "character",
      mentions,
    });
  }

  return entities;
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, (_, row) => Array.from({ length: cols }, (_, col) => (row === 0 ? col : col === 0 ? row : 0)));
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      matrix[row][col] = a[row - 1] === b[col - 1]
        ? matrix[row - 1][col - 1]
        : 1 + Math.min(matrix[row - 1][col], matrix[row][col - 1], matrix[row - 1][col - 1]);
    }
  }
  return matrix[a.length][b.length];
}

function formatFactSuffix(fact: LoreFact, locale: string): string {
  const messages = getMcpMessages(locale).loreGuardian;
  const segments: string[] = [];
  if (fact.chapter) segments.push(`${messages.suffixChapter}${fact.chapter}`);
  if (fact.temporal?.start || fact.temporal?.end) {
    segments.push(messages.suffixTime(fact.temporal.start ?? "?", fact.temporal.end ?? "?"));
  }
  if (fact.causal?.forecastHorizonChapters) {
    segments.push(messages.suffixForecast(fact.causal.forecastHorizonChapters));
  }
  return segments.length > 0 ? ` (${segments.join(", ")})` : "";
}

export const loreGuardian = withErrorHandling(async (input: LoreGuardianInput, projectsRoot: string): Promise<string> => {
  const locale = resolveRequestLocale(input);
  const messages = getMcpMessages(locale).loreGuardian;
  const projectService = createProjectService(projectsRoot);
  await projectService.ensureProjectDirectories(input.project);

  if (input.action === "add_fact") {
    if (!input.fact) {
      throw new ScriptoriumError(
        mcpEntry((catalog) => catalog.loreGuardian.addFactRequired),
        "VALIDATION_ERROR",
      );
    }

    const fact = toLoreFact(input.fact);
    const existingFacts = await projectService.readLoreFacts(input.project);
    const replaced = existingFacts.some((existing) => existing.category === fact.category && existing.key.toLowerCase() === fact.key.toLowerCase());

    await projectService.appendLoreFact(input.project, fact);
    await projectService.appendToMarkdownSection(
      input.project,
      messages.rulesLoreSection,
      `**${fact.key}**: ${fact.value}${formatFactSuffix(fact, locale)}`,
      { documentTitle: locale.startsWith("ru") ? "Библия мира" : "World Bible" },
    );

    if (loreService.isConnected) {
      await loreService.upsertEntity({
        name: fact.key,
        type: categoryToEntityType(fact.category),
        project: input.project,
        observations: [fact.value, ...(input.fact.observations ?? [])],
        aliases: input.fact.aliases ?? [],
        properties: { category: fact.category },
        localized: input.fact.localized ? {
          name: input.fact.localized.key,
          observations: input.fact.localized.value ? [input.fact.localized.value] : undefined,
        } : undefined,
        confidence: fact.confidence,
        provenance: makeProvenance("manual", "lore_guardian", fact.confidence),
        chapter: fact.chapter,
        temporal: fact.temporal,
        causal: fact.causal,
      });
    }

    eventBus.emitEvent("fact.registered", {
      project: input.project,
      actor: "lore_guardian",
      details: {
        key: fact.key,
        category: fact.category,
        chapter: fact.chapter,
        hasTemporal: Boolean(fact.temporal),
        hasCausal: Boolean(fact.causal),
        locale,
      },
    });

    logOperation(replaced ? "fact_updated" : "fact_added", fact.key, { project: input.project, graph: loreService.isConnected, locale });
    return replaced
      ? messages.factUpdated(messages.categoryLabels[fact.category] ?? fact.category, fact.key, fact.value)
      : messages.factRegistered(messages.categoryLabels[fact.category] ?? fact.category, fact.key, fact.value);
  }

  const facts = await projectService.readLoreFacts(input.project);

  if (input.action === "list_facts") {
    const filtered = input.category ? facts.filter((fact) => fact.category === input.category) : facts;
    if (filtered.length === 0) {
      return messages.listEmpty;
    }

    const grouped = new Map<string, LoreFact[]>();
    for (const fact of filtered) {
      grouped.set(fact.category, [...(grouped.get(fact.category) ?? []), fact]);
    }

    const lines: string[] = [];
    for (const [category, categoryFacts] of grouped.entries()) {
      const label = messages.categoryLabels[category] ?? category;
      lines.push(messages.categoryHeading(label));
      for (const fact of categoryFacts) {
        lines.push(`  - **${fact.key}**: ${fact.value}${formatFactSuffix(fact, locale)}`);
      }
    }

    const graphSummary = loreService.isConnected ? await loreService.getGraphSummary(input.project) : null;
    const graphNote = graphSummary && graphSummary.nodes > 0
      ? messages.graphSummary(graphSummary.nodes, graphSummary.relations)
      : "";

    return messages.listTitle(input.project, lines.join("\n"), graphNote);
  }

  if (input.action === "check_consistency") {
    if (!input.text) {
      throw new ScriptoriumError(
        mcpEntry((catalog) => catalog.loreGuardian.consistencyTextRequired),
        "VALIDATION_ERROR",
      );
    }

    const issues: string[] = [];
    const entities = extractEntities(input.text);
    const textLower = input.text.toLowerCase();

    if (loreService.isConnected) {
      const graphContradictions = await loreService.findContradictions(input.project);
      for (const contradiction of graphContradictions) {
        issues.push(`[Graph] ${contradiction.issue}: ${contradiction.entity}`);
      }
    }

    for (const entity of entities) {
      const matchingFacts = facts.filter((fact) => fact.key.toLowerCase() === entity.name.toLowerCase() || fact.value.toLowerCase().includes(entity.name.toLowerCase()));
      if (matchingFacts.length === 0 && entity.mentions > 1) {
        issues.push(messages.newRecurringEntity(entity.name, messages.recurringEntityTypes[entity.type] ?? entity.type));
        continue;
      }

      for (const fact of matchingFacts) {
        const valueLower = fact.value.toLowerCase();
        const contradictionPairs = [
          ["dead", /(alive|survived)/],
          ["alive", /(dead|slain|killed)/],
          ["north", /south/],
          ["south", /north/],
          ["young", /old/],
          ["old", /young/],
          ["king", /queen/],
        ] as const;

        for (const [literal, opposite] of contradictionPairs) {
          if ((valueLower.includes(literal) && opposite.test(textLower)) || (textLower.includes(literal) && opposite.test(valueLower))) {
            issues.push(messages.contradiction(fact.key, fact.value));
            break;
          }
        }
      }
    }

    for (const characterFact of facts.filter((fact) => fact.category === "character")) {
      const canonical = characterFact.key.toLowerCase();
      for (const entity of entities.filter((entry) => entry.type === "character" && entry.name.length > 3)) {
        if (levenshtein(entity.name.toLowerCase(), canonical) === 1) {
          issues.push(messages.possibleMisspelling(entity.name, characterFact.key));
        }
      }
    }

    const timelineFacts = facts.filter((fact) => fact.chapter !== undefined).sort((left, right) => (left.chapter ?? 0) - (right.chapter ?? 0));
    for (let index = 1; index < timelineFacts.length; index += 1) {
      const previous = timelineFacts[index - 1].chapter ?? 0;
      const current = timelineFacts[index].chapter ?? 0;
      if (current - previous > 5) {
        issues.push(messages.timelineGap(previous, current));
      }
    }

    eventBus.emitEvent("lore.checked", {
      project: input.project,
      actor: "lore_guardian",
      details: { issues: issues.length, locale },
    });

    logOperation("consistency_check", input.project, { issues: issues.length, locale });
    return issues.length === 0
      ? messages.consistencyPassed(facts.length)
      : messages.consistencyResults(issues.length, issues);
  }

  if (input.action === "check_timeline") {
    const timelineFacts = facts
      .filter((fact) => fact.chapter !== undefined || fact.temporal?.chapterSpanStart !== undefined || fact.temporal?.chapterSpanEnd !== undefined)
      .sort((left, right) => (left.chapter ?? left.temporal?.chapterSpanStart ?? 0) - (right.chapter ?? right.temporal?.chapterSpanStart ?? 0));

    if (timelineFacts.length === 0) {
      return messages.timelineEmpty;
    }

    const lines = timelineFacts.map((fact) => {
      const chapter = fact.chapter ?? fact.temporal?.chapterSpanStart ?? fact.temporal?.chapterSpanEnd ?? 0;
      return messages.timelineLine(
        chapter,
        messages.categoryLabels[fact.category] ?? fact.category,
        fact.key,
        fact.value,
        formatFactSuffix(fact, locale),
      );
    });
    return messages.timelineTitle(input.project, lines.join("\n"));
  }

  throw new ScriptoriumError(
    mcpEntry((catalog) => catalog.loreGuardian.unknownAction),
    "VALIDATION_ERROR",
  );
}, "lore_guardian");
