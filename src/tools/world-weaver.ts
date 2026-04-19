import { z } from "zod";
import fs from "fs-extra";
import path from "path";

import { getMcpMessages, mcpEntry } from "../core/i18n/mcp/index.js";
import { SERVER_LOCALE, resolveRequestLocale, withLocaleInput } from "../core/i18n/runtime.js";
import { createProjectService } from "../services/project-service.js";
import eventBus from "../utils/event-bus.js";
import { withErrorHandling, ScriptoriumError, logOperation } from "../utils/error-handler.js";

const WORLD_ELEMENT_KEYS = [
  "world",
  "location",
  "culture",
  "core_systems",
  "timeline",
  "faction",
  "theme",
  "society",
  "magic_system",
  "technology",
] as const;

const serverMessages = getMcpMessages(SERVER_LOCALE);

const worldWeaverSchemaBase = z.object({
  action: z.enum(["create", "expand", "list", "get"]).describe(serverMessages.worldWeaver.schema.action),
  project: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe(serverMessages.worldWeaver.schema.project),
  element: z.enum(WORLD_ELEMENT_KEYS).optional().describe(serverMessages.worldWeaver.schema.element),
  name: z.string().min(1).max(100).optional().describe(serverMessages.worldWeaver.schema.name),
  description: z.string().max(2000).optional().describe(serverMessages.worldWeaver.schema.description),
  genre: z.string().optional().describe(serverMessages.worldWeaver.schema.genre),
});

export const worldWeaverSchema = withLocaleInput(worldWeaverSchemaBase);
export type WorldWeaverInput = z.infer<typeof worldWeaverSchema>;

function buildWorldBibleTemplate(
  project: string,
  worldName: string,
  genre: string,
  description: string,
  locale: string,
): string {
  const messages = getMcpMessages(locale).worldWeaver;
  const isSpeculative = /fantasy|scifi|epic|urban|litrpg|grimdark|hardcore/i.test(genre);
  const isRussian = locale.startsWith("ru");

  const coreSection = isRussian
    ? isSpeculative
      ? "## Базовые системы и правила\n<!-- Физика мира, магия, технологии или общественные правила в зависимости от жанра -->"
      : "## Базовые системы и правила\n<!-- Исторические ограничения, социальные нормы, тематическая логика, психологическая непротиворечивость, правила тайны или романтическая рамка -->"
    : isSpeculative
      ? "## Core Systems & Rules\n<!-- Physics, magic, technology, or social rules depending on genre -->"
      : "## Core Systems & Rules\n<!-- Historical constraints, social norms, thematic logic, psychological consistency, mystery rules, or romantic frameworks -->";

  if (isRussian) {
    return `# ${messages.worldBibleTitle} - ${worldName}

**Проект:** ${project}
**Жанр:** ${genre}
**Обновлено:** ${new Date().toISOString()}

## Обзор
${description}

## Локации

## Культуры и народы

${coreSection}

## Общество и культура

## Таймлайн

## Фракции и организации

## Тематический каркас

## Правила и лор
`;
  }

  return `# ${messages.worldBibleTitle} - ${worldName}

**Project:** ${project}
**Genre:** ${genre}
**Last Updated:** ${new Date().toISOString()}

## Overview
${description}

## Locations

## Cultures & Peoples

${coreSection}

## Society & Culture

## Timeline

## Factions & Organizations

## Thematic Framework

## Rules & Lore
`;
}

function slugify(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

export const worldWeaver = withErrorHandling(async (input: WorldWeaverInput, projectsRoot: string): Promise<string> => {
  const locale = resolveRequestLocale(input);
  const messages = getMcpMessages(locale).worldWeaver;
  logOperation("world_weaver", input.action, { project: input.project, element: input.element, locale });

  const projectService = createProjectService(projectsRoot);
  await projectService.ensureProjectDirectories(input.project);

  const worldDir = path.join(projectService.projectDir(input.project), "world");

  if (input.action === "create") {
    const genre = input.genre ?? "fantasy";
    const worldName = input.name ?? input.project;
    const description = input.description ?? messages.defaultDescription;
    const template = buildWorldBibleTemplate(input.project, worldName, genre, description, locale);
    await projectService.writeWorldBible(input.project, template);
    logOperation("world_bible_created", worldName, { project: input.project });
    eventBus.emitEvent("world.updated", {
      project: input.project,
      actor: "world_weaver",
      details: { action: input.action, worldName, genre, locale },
    });
    return messages.createSuccess(worldName);
  }

  if (input.action === "expand") {
    if (!input.element || !input.name) {
      throw new ScriptoriumError(
        mcpEntry((catalog) => catalog.worldWeaver.expandValidation),
        "VALIDATION_ERROR",
        [mcpEntry((catalog) => catalog.worldWeaver.expandValidationSuggestion)],
      );
    }

    const safeName = slugify(input.name);
    const elementFile = path.join(worldDir, `${input.element}_${safeName}.md`);
    const elementLabel = messages.elementLabels[input.element];
    const content = locale.startsWith("ru")
      ? `# ${elementLabel.toUpperCase()}: ${input.name}

${input.description ?? messages.elementContentFallback}

## ${messages.elementFileNotesTitle}
- ${messages.elementFileAdded}: ${new Date().toISOString()}
- ${messages.elementFileSource}: world_weaver.expand
`
      : `# ${elementLabel.toUpperCase()}: ${input.name}

${input.description ?? messages.elementContentFallback}

## ${messages.elementFileNotesTitle}
- ${messages.elementFileAdded}: ${new Date().toISOString()}
- ${messages.elementFileSource}: world_weaver.expand
`;

    await projectService.writeMarkdownAtomic(elementFile, content);
    const sectionHeader = messages.sections[input.element] ?? messages.sections.world;
    const entryDescription = input.description?.replace(/\s+/g, " ").trim() ?? messages.entryDescriptionFallback;
    const entry = `**${input.name}**: ${entryDescription} -> [${path.basename(elementFile)}](world/${path.basename(elementFile)})`;
    await projectService.appendToMarkdownSection(input.project, sectionHeader, entry, {
      documentTitle: messages.worldBibleTitle,
    });

    logOperation("world_expanded", input.name, { element: input.element, project: input.project });
    eventBus.emitEvent("world.updated", {
      project: input.project,
      actor: "world_weaver",
      details: { action: input.action, element: input.element, name: input.name, locale },
    });
    return messages.expandSuccess(elementLabel, input.name);
  }

  if (input.action === "list") {
    const files = (await fs.readdir(worldDir).catch(() => [])).filter((file) => file.endsWith(".md"));
    if (files.length === 0) {
      return messages.listEmpty;
    }

    return messages.listTitle(input.project, files.map((file) => `- ${file}`).join("\n"));
  }

  if (input.action === "get") {
    const bible = await projectService.readWorldBible(input.project);
    if (!bible) {
      throw new ScriptoriumError(
        mcpEntry((catalog) => catalog.worldWeaver.missingBible),
        "NOT_FOUND",
        [mcpEntry((catalog) => catalog.worldWeaver.missingBibleSuggestion)],
      );
    }
    return bible;
  }

  throw new ScriptoriumError(
    mcpEntry((catalog) => catalog.worldWeaver.unknownAction),
    "VALIDATION_ERROR",
  );
}, "world_weaver");
