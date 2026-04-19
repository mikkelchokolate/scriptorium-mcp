import { z } from "zod";

import { withErrorHandling, ScriptoriumError, logOperation } from "../utils/error-handler.js";
import eventBus from "../utils/event-bus.js";
import loreService from "../services/lore-service.js";
import { createProjectService } from "../services/project-service.js";
import type {
  LoreFact,
  LoreFactLocalization,
  ProvenanceSource,
  TemporalMetadata,
  CausalMetadata,
} from "../core/domain/entities.js";
import { makeProvenance } from "../core/domain/entities.js";

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

const localizedTextSchema = z.object({
  en: z.string().min(1).max(500).optional(),
  ru: z.string().min(1).max(500).optional(),
}).refine((value) => Boolean(value.en || value.ru), {
  message: "At least one localized value is required.",
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

export const loreGuardianSchema = z.object({
  action: z.enum(["check_consistency", "add_fact", "list_facts", "check_timeline"]).describe("Action to perform"),
  project: z.string().describe("Project name/directory").regex(/^[a-zA-Z0-9_-]+$/).describe("Sanitized project name"),
  text: z.string().optional().describe("Text to check for consistency"),
  fact: loreFactInputSchema.optional().describe("Fact to register"),
  category: z.enum(factCategories).optional(),
});

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

function formatFactSuffix(fact: LoreFact): string {
  const segments: string[] = [];
  if (fact.chapter) segments.push(`Ch.${fact.chapter}`);
  if (fact.temporal?.start || fact.temporal?.end) {
    segments.push(`time=${fact.temporal.start ?? "?"}..${fact.temporal.end ?? "?"}`);
  }
  if (fact.causal?.forecastHorizonChapters) {
    segments.push(`forecast+${fact.causal.forecastHorizonChapters}`);
  }
  return segments.length > 0 ? ` (${segments.join(", ")})` : "";
}

export const loreGuardian = withErrorHandling(async (input: LoreGuardianInput, projectsRoot: string): Promise<string> => {
  const projectService = createProjectService(projectsRoot);
  await projectService.ensureProjectDirectories(input.project);

  if (input.action === "add_fact") {
    if (!input.fact) {
      throw new ScriptoriumError("Fact object is required for add_fact", "VALIDATION_ERROR");
    }

    const fact = toLoreFact(input.fact);
    const existingFacts = await projectService.readLoreFacts(input.project);
    const replaced = existingFacts.some((existing) => existing.category === fact.category && existing.key.toLowerCase() === fact.key.toLowerCase());

    await projectService.appendLoreFact(input.project, fact);
    await projectService.appendToMarkdownSection(
      input.project,
      "## Rules & Lore",
      `**${fact.key}**: ${fact.value}${formatFactSuffix(fact)}`,
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
      },
    });

    logOperation(replaced ? "fact_updated" : "fact_added", fact.key, { project: input.project, graph: loreService.isConnected });
    return replaced
      ? `Fact updated: [${fact.category}] "${fact.key}" = "${fact.value}".`
      : `Fact registered: [${fact.category}] "${fact.key}" = "${fact.value}".`;
  }

  const facts = await projectService.readLoreFacts(input.project);

  if (input.action === "list_facts") {
    const filtered = input.category ? facts.filter((fact) => fact.category === input.category) : facts;
    if (filtered.length === 0) {
      return "No facts registered yet. Use 'add_fact' to build the project knowledge base.";
    }

    const grouped = new Map<string, LoreFact[]>();
    for (const fact of filtered) {
      grouped.set(fact.category, [...(grouped.get(fact.category) ?? []), fact]);
    }

    const lines: string[] = [];
    for (const [category, categoryFacts] of grouped.entries()) {
      lines.push(`\n### ${category.toUpperCase()}`);
      for (const fact of categoryFacts) {
        lines.push(`  - **${fact.key}**: ${fact.value}${formatFactSuffix(fact)}`);
      }
    }

    const graphSummary = loreService.isConnected ? await loreService.getGraphSummary(input.project) : null;
    const graphNote = graphSummary && graphSummary.nodes > 0
      ? `\n\nGraph extension: ${graphSummary.nodes} nodes, ${graphSummary.relations} relations.`
      : "";

    return `Lore Facts for "${input.project}":${lines.join("\n")}${graphNote}`;
  }

  if (input.action === "check_consistency") {
    if (!input.text) {
      throw new ScriptoriumError("Text is required for consistency check", "VALIDATION_ERROR");
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
        issues.push(`New recurring entity detected: "${entity.name}" (${entity.type}). Consider registering it with add_fact.`);
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
            issues.push(`Potential contradiction for "${fact.key}": lore says "${fact.value}".`);
            break;
          }
        }
      }
    }

    for (const characterFact of facts.filter((fact) => fact.category === "character")) {
      const canonical = characterFact.key.toLowerCase();
      for (const entity of entities.filter((entry) => entry.type === "character" && entry.name.length > 3)) {
        if (levenshtein(entity.name.toLowerCase(), canonical) === 1) {
          issues.push(`Possible name misspelling: "${entity.name}" vs registered "${characterFact.key}".`);
        }
      }
    }

    const timelineFacts = facts.filter((fact) => fact.chapter !== undefined).sort((left, right) => (left.chapter ?? 0) - (right.chapter ?? 0));
    for (let index = 1; index < timelineFacts.length; index += 1) {
      const previous = timelineFacts[index - 1].chapter ?? 0;
      const current = timelineFacts[index].chapter ?? 0;
      if (current - previous > 5) {
        issues.push(`Timeline gap detected between Ch.${previous} and Ch.${current}.`);
      }
    }

    eventBus.emitEvent("lore.checked", {
      project: input.project,
      actor: "lore_guardian",
      details: { issues: issues.length },
    });

    logOperation("consistency_check", input.project, { issues: issues.length });
    return issues.length === 0
      ? `Consistency check passed against ${facts.length} registered fact(s).`
      : `Consistency Check Results (${issues.length} issue(s)):\n\n${issues.map((issue) => `- ${issue}`).join("\n")}`;
  }

  if (input.action === "check_timeline") {
    const timelineFacts = facts
      .filter((fact) => fact.chapter !== undefined || fact.temporal?.chapterSpanStart !== undefined || fact.temporal?.chapterSpanEnd !== undefined)
      .sort((left, right) => (left.chapter ?? left.temporal?.chapterSpanStart ?? 0) - (right.chapter ?? right.temporal?.chapterSpanStart ?? 0));

    if (timelineFacts.length === 0) {
      return "No timeline facts registered. Add facts with chapter numbers to build a timeline.";
    }

    const lines = timelineFacts.map((fact) => {
      const chapter = fact.chapter ?? fact.temporal?.chapterSpanStart ?? fact.temporal?.chapterSpanEnd ?? 0;
      return `  Ch.${String(chapter).padStart(2, "0")} | [${fact.category}] ${fact.key}: ${fact.value}${formatFactSuffix(fact)}`;
    });
    return `Timeline for "${input.project}":\n${lines.join("\n")}`;
  }

  throw new ScriptoriumError("Unknown action for lore_guardian", "VALIDATION_ERROR");
}, "lore_guardian");
