import { z } from "zod";
import fs from "fs-extra";
import path from "path";
import { withErrorHandling, ScriptoriumError, logOperation } from "../utils/error-handler.js";
import { createProjectService } from "../services/project-service.js";
import eventBus from "../utils/event-bus.js";

export const worldWeaverSchema = z.object({
  action: z.enum(["create", "expand", "list", "get"]).describe("Action to perform"),
  project: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Sanitized project name/directory"),
  element: z.enum(["world", "location", "culture", "core_systems", "timeline", "faction", "theme", "society", "magic_system", "technology"]).optional().describe("World element type (core_systems is neutral replacement for magic/tech; speculative genres use aliases)"),
  name: z.string().min(1).max(100).optional().describe("Name of the element"),
  description: z.string().max(2000).optional().describe("Description or details to add"),
  genre: z.string().optional().describe("Genre (fantasy, sci-fi, historical_fiction, contemporary_literary, mystery_thriller, romance, memoir, etc.)"),
});

export type WorldWeaverInput = z.infer<typeof worldWeaverSchema>;

const SECTION_MAP: Record<string, string> = {
  location: "## Locations",
  culture: "## Cultures & Peoples",
  core_systems: "## Core Systems & Rules",
  magic_system: "## Core Systems & Rules",
  technology: "## Core Systems & Rules",
  timeline: "## Timeline",
  faction: "## Factions & Organizations",
  theme: "## Thematic Framework",
  society: "## Society & Culture",
  world: "## Overview",
};

function buildWorldBibleTemplate(project: string, worldName: string, genre: string, description: string): string {
  const isSpeculative = /fantasy|scifi|epic|urban|litrpg|grimdark|hardcore/i.test(genre);
  const coreSection = isSpeculative
    ? "## Core Systems & Rules\n<!-- Physics, magic, technology, or social rules depending on genre -->"
    : "## Core Systems & Rules\n<!-- Historical constraints, social norms, thematic logic, psychological consistency, mystery rules, or romantic frameworks -->";

  return `# World Bible — ${worldName}\n\n**Project:** ${project}\n**Genre:** ${genre}\n**Last Updated:** ${new Date().toISOString()}\n\n## Overview\n${description}\n\n## Locations\n\n## Cultures & Peoples\n\n${coreSection}\n\n## Society & Culture\n\n## Timeline\n\n## Factions & Organizations\n\n## Thematic Framework\n\n## Rules & Lore\n`;
}

function slugify(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

export const worldWeaver = withErrorHandling(async (input: WorldWeaverInput, projectsRoot: string): Promise<string> => {
  logOperation("world_weaver", input.action, { project: input.project, element: input.element });

  const projectService = createProjectService(projectsRoot);
  await projectService.ensureProjectDirectories(input.project);

  const worldDir = path.join(projectService.projectDir(input.project), "world");

  if (input.action === "create") {
    const genre = input.genre ?? "fantasy";
    const worldName = input.name ?? input.project;
    const description = input.description ?? "A world or setting waiting to be developed.";
    const template = buildWorldBibleTemplate(input.project, worldName, genre, description);
    await projectService.writeWorldBible(input.project, template);
    logOperation("world_bible_created", worldName, { project: input.project });
    eventBus.emitEvent("world.updated", {
      project: input.project,
      actor: "world_weaver",
      details: { action: input.action, worldName, genre },
    });
    return `World Bible created for "${worldName}".\n\nThe canonical bible file is world_bible.md.`;
  }

  if (input.action === "expand") {
    if (!input.element || !input.name) {
      throw new ScriptoriumError("'element' and 'name' are required for expand action.", "VALIDATION_ERROR", ["Provide both element and name parameters"]);
    }

    const safeName = slugify(input.name);
    const elementFile = path.join(worldDir, `${input.element}_${safeName}.md`);
    const content = `# ${input.element.replace(/_/g, " ").toUpperCase()}: ${input.name}\n\n${input.description ?? "Details inscribed by the World Weaver."}\n\n## Notes\n- Added: ${new Date().toISOString()}\n- Source: world_weaver.expand\n`;

    await projectService.writeMarkdownAtomic(elementFile, content);
    const sectionHeader = SECTION_MAP[input.element] ?? "## Overview";
    const entryDescription = input.description?.replace(/\s+/g, " ").trim() ?? "See detailed file.";
    const entry = `**${input.name}**: ${entryDescription} → [${path.basename(elementFile)}](world/${path.basename(elementFile)})`;
    await projectService.appendToMarkdownSection(input.project, sectionHeader, entry);

    logOperation("world_expanded", input.name, { element: input.element, project: input.project });
    eventBus.emitEvent("world.updated", {
      project: input.project,
      actor: "world_weaver",
      details: { action: input.action, element: input.element, name: input.name },
    });
    return `Added ${input.element} "${input.name}" and updated world_bible.md.`;
  }

  if (input.action === "list") {
    const files = (await fs.readdir(worldDir).catch(() => [])).filter((file) => file.endsWith(".md"));
    if (files.length === 0) {
      return "No world elements found. Use 'expand' to add some.";
    }
    return `World elements in "${input.project}":\n${files.map((file) => `  - ${file}`).join("\n")}`;
  }

  if (input.action === "get") {
    const bible = await projectService.readWorldBible(input.project);
    if (!bible) {
      throw new ScriptoriumError("No World Bible found. Use 'create' to start one.", "NOT_FOUND", ["Run world_weaver with action=create"]);
    }
    return bible;
  }

  throw new ScriptoriumError("Unknown action for world_weaver.", "VALIDATION_ERROR");
}, "world_weaver");
