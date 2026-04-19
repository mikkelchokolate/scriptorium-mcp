import fs from "fs-extra";
import path from "path";
import { z } from "zod";
import { withErrorHandling, ScriptoriumError, logOperation } from "../utils/error-handler.js";
import { createProjectService } from "../services/project-service.js";
import type { ProjectMeta } from "../core/domain/entities.js";

export const projectManagerSchema = z.object({
  action: z.enum(["create", "list", "info", "delete", "export"]).describe("Action to perform"),
  project: z.string().optional().describe("Project name"),
  genre: z.string().optional().describe("Genre for new project"),
  description: z.string().optional().describe("Project description"),
  format: z.enum(["epub", "html", "md"]).optional().describe("Export format (requires pandoc for epub)"),
});

export type ProjectManagerInput = z.infer<typeof projectManagerSchema>;

function buildBibleTemplate(project: string, genre: string, description: string): string {
  const isSpeculative = /fantasy|scifi|epic|urban|litrpg|grimdark|hardcore|magic|tech/i.test(genre);
  const coreSection = isSpeculative
    ? "## Core Systems & Rules\n<!-- Physics, magic, technology, or social rules depending on genre -->\n\n## Society & Culture"
    : "## Psychological Landscape & Themes\n<!-- Deep character psychology, emotional arcs, thematic coherence for literary, memoir, romance -->\n\n## Social & Historical Context\n<!-- For literary and historical fiction -->";

  return `# World Bible — ${project}

**Genre:** ${genre}
**Last Updated:** ${new Date().toISOString()}

## Overview
${description}

## Locations

## Cultures & Peoples

${coreSection}

## Timeline

## Factions & Organizations

## Thematic Framework
<!-- Key for literary fiction, romance arcs, memoir themes, mystery logic -->

## Rules & Lore
<!-- Facts registered via lore_guardian belong here. -->
`;
}

export const projectManager = withErrorHandling(async (input: ProjectManagerInput, projectsRoot: string): Promise<string> => {
  const projectService = createProjectService(projectsRoot);

  if (input.action === "list") {
    const projects = await projectService.listProjects();
    if (projects.length === 0) {
      return "No projects yet. Use 'create' to start a new book project.";
    }
    return `Scriptorium Projects:\n${projects.map((project) => `  - ${project}`).join("\n")}`;
  }

  if (input.action === "create") {
    if (!input.project) {
      throw new ScriptoriumError("'project' name is required for create.", "VALIDATION_ERROR");
    }

    const projectDir = projectService.projectDir(input.project);
    const genre = input.genre ?? "contemporary_literary";
    const description = input.description ?? "A story waiting to be told.";

    await fs.ensureDir(projectDir);
    await fs.ensureDir(path.join(projectDir, "chapters"));
    await fs.ensureDir(path.join(projectDir, "characters"));
    await fs.ensureDir(path.join(projectDir, "world"));
    await fs.ensureDir(path.join(projectDir, "exports"));

    await projectService.writeLoreFacts(input.project, []);

    const meta: ProjectMeta = {
      name: input.project,
      genre,
      description,
      created: new Date().toISOString(),
      mode: "solo_author",
      living_bible_synced: false,
      version: "1.2.0",
    };

    await projectService.writeProjectMeta(input.project, meta);
    await projectService.writeWorldBible(input.project, buildBibleTemplate(input.project, genre, description));
    await projectService.removeLegacyLivingBible(input.project);

    logOperation("project_created", input.project, { genre: meta.genre });
    return `Project "${input.project}" created.\n\nDirectory:\n  ${input.project}/\n  ├── project.json\n  ├── world_bible.md\n  ├── lore_facts.json\n  ├── chapters/\n  ├── characters/\n  ├── world/\n  └── exports/\n\nThe canonical project bible is world_bible.md.`;
  }

  if (input.action === "info") {
    if (!input.project) {
      throw new ScriptoriumError("'project' name is required for info.", "VALIDATION_ERROR");
    }

    const meta = await projectService.getProjectMeta(input.project);
    const chaptersDir = path.join(projectService.projectDir(input.project), "chapters");
    const charactersDir = path.join(projectService.projectDir(input.project), "characters");
    const chapters = (await fs.readdir(chaptersDir).catch(() => [])).filter((file) => file.endsWith(".md")).length;
    const characters = (await fs.readdir(charactersDir).catch(() => [])).filter((file) => file.endsWith(".json") && file !== "index.json").length;
    const hasBible = await fs.pathExists(projectService.getWorldBiblePath(input.project));
    const hasOutline = await fs.pathExists(path.join(projectService.projectDir(input.project), "outline.json"));
    const hasLore = (await projectService.readLoreFacts(input.project)).length > 0 || await fs.pathExists(path.join(projectService.projectDir(input.project), "lore_facts.json"));

    return `Project: ${meta.name}\nGenre: ${meta.genre}\nDescription: ${meta.description || "none"}\nCreated: ${meta.created}\nWorld Bible: ${hasBible ? "present" : "missing"}\n\nProgress:\n  Chapters: ${chapters}\n  Characters: ${characters}\n  Lore Facts File: ${hasLore ? "present" : "missing"}\n  Outline: ${hasOutline ? "present" : "missing"}`;
  }

  if (input.action === "delete") {
    if (!input.project) {
      throw new ScriptoriumError("'project' name is required for delete.", "VALIDATION_ERROR");
    }

    const projectDir = projectService.projectDir(input.project);
    if (!await fs.pathExists(projectDir)) {
      throw new ScriptoriumError(`Project "${input.project}" not found.`, "NOT_FOUND");
    }

    await fs.remove(projectDir);
    logOperation("project_deleted", input.project);
    return `Project "${input.project}" has been deleted.`;
  }

  if (input.action === "export") {
    if (!input.project) {
      throw new ScriptoriumError("'project' name is required for export.", "VALIDATION_ERROR");
    }

    const projectDir = projectService.projectDir(input.project);
    if (!await fs.pathExists(projectDir)) {
      throw new ScriptoriumError(`Project "${input.project}" not found.`, "NOT_FOUND");
    }

    const exportDir = path.join(projectDir, "exports");
    await fs.ensureDir(exportDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baseName = `${input.project}_${timestamp}`;
    const format = input.format ?? "html";
    const bibleContent = await projectService.readWorldBible(input.project) ?? "# World Bible\n\n(No content yet)";

    let output = `# ${input.project.toUpperCase()} - Manuscript Bundle\n\n${bibleContent}\n\n## Chapters\n`;
    const chaptersDir = path.join(projectDir, "chapters");
    const chapterFiles = (await fs.readdir(chaptersDir).catch(() => [])).filter((file) => file.endsWith(".md")).sort();

    for (const file of chapterFiles) {
      const chapterContent = await fs.readFile(path.join(chaptersDir, file), "utf-8");
      output += `\n\n${chapterContent}`;
    }

    const extension = format === "epub" ? "html" : format;
    const outPath = path.join(exportDir, `${baseName}.${extension}`);
    await fs.writeFile(outPath, output, "utf-8");

    if (format === "epub") {
      logOperation("export_attempted", "epub_fallback", { project: input.project, note: "Pandoc is not invoked automatically." });
    }

    logOperation("export_completed", format, { project: input.project });
    return `Exported "${input.project}" as ${format} to exports/${baseName}.${extension}.`;
  }

  throw new ScriptoriumError("Unknown action for project_manager.", "VALIDATION_ERROR");
}, "project_manager");
