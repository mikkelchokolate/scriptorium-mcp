import fs from "fs-extra";
import path from "path";
import { z } from "zod";

import { getMcpMessages, mcpEntry } from "../core/i18n/mcp/index.js";
import { SERVER_LOCALE, resolveRequestLocale, withLocaleInput } from "../core/i18n/runtime.js";
import type { ProjectMeta } from "../core/domain/entities.js";
import { createProjectService } from "../services/project-service.js";
import eventBus from "../utils/event-bus.js";
import { withErrorHandling, ScriptoriumError, logOperation } from "../utils/error-handler.js";

const serverMessages = getMcpMessages(SERVER_LOCALE);

const projectManagerSchemaBase = z.object({
  action: z.enum(["create", "list", "info", "delete", "export"]).describe(serverMessages.projectManager.schema.action),
  project: z.string().optional().describe(serverMessages.projectManager.schema.project),
  genre: z.string().optional().describe(serverMessages.projectManager.schema.genre),
  description: z.string().optional().describe(serverMessages.projectManager.schema.description),
  format: z.enum(["epub", "html", "md"]).optional().describe(serverMessages.projectManager.schema.format),
});

export const projectManagerSchema = withLocaleInput(projectManagerSchemaBase);
export type ProjectManagerInput = z.infer<typeof projectManagerSchema>;

function buildBibleTemplate(project: string, genre: string, description: string, locale: string): string {
  const messages = getMcpMessages(locale).projectManager;
  const isSpeculative = /fantasy|scifi|epic|urban|litrpg|grimdark|hardcore|magic|tech/i.test(genre);
  const coreSection = isSpeculative
    ? `## ${messages.buildBible.coreSystems}\n<!-- ${messages.buildBible.speculativeComment} -->\n\n## ${locale.startsWith("ru") ? "Общество и культура" : "Society & Culture"}`
    : `## ${messages.buildBible.psychologicalLandscape}\n<!-- ${messages.buildBible.groundedComment} -->\n\n## ${messages.buildBible.socialContext}\n<!-- ${locale.startsWith("ru") ? "Для literary и historical fiction." : "For literary and historical fiction."} -->`;

  return `# ${messages.buildBible.overview === "Обзор" ? "Библия мира" : "World Bible"} - ${project}

**${messages.buildBible.genre}:** ${genre}
**${messages.buildBible.lastUpdated}:** ${new Date().toISOString()}

## ${messages.buildBible.overview}
${description}

## ${messages.buildBible.locations}

## ${messages.buildBible.cultures}

${coreSection}

## ${messages.buildBible.timeline}

## ${messages.buildBible.factions}

## ${messages.buildBible.thematicFramework}
<!-- ${messages.buildBible.thematicComment} -->

## ${messages.buildBible.rulesLore}
<!-- ${messages.buildBible.loreComment} -->
`;
}

export const projectManager = withErrorHandling(async (input: ProjectManagerInput, projectsRoot: string): Promise<string> => {
  const locale = resolveRequestLocale(input);
  const messages = getMcpMessages(locale).projectManager;
  const projectService = createProjectService(projectsRoot);

  if (input.action === "list") {
    const projects = await projectService.listProjects();
    if (projects.length === 0) {
      return messages.listEmpty;
    }
    return messages.listTitle(projects.map((project) => `- ${project}`).join("\n"));
  }

  if (input.action === "create") {
    if (!input.project) {
      throw new ScriptoriumError(
        mcpEntry((catalog) => catalog.projectManager.projectNameRequired("create")),
        "VALIDATION_ERROR",
      );
    }

    const projectDir = projectService.projectDir(input.project);
    const genre = input.genre ?? "contemporary_literary";
    const description = input.description ?? messages.defaultDescription;

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
    await projectService.writeWorldBible(input.project, buildBibleTemplate(input.project, genre, description, locale));
    await projectService.removeLegacyLivingBible(input.project);

    logOperation("project_created", input.project, { genre: meta.genre, locale });
    eventBus.emitEvent("project.created", {
      project: input.project,
      actor: "project_manager",
      details: { genre: meta.genre, locale },
    });
    return messages.createSuccess(input.project);
  }

  if (input.action === "info") {
    if (!input.project) {
      throw new ScriptoriumError(
        mcpEntry((catalog) => catalog.projectManager.projectNameRequired("info")),
        "VALIDATION_ERROR",
      );
    }

    const meta = await projectService.getProjectMeta(input.project);
    const chaptersDir = path.join(projectService.projectDir(input.project), "chapters");
    const charactersDir = path.join(projectService.projectDir(input.project), "characters");
    const chapters = (await fs.readdir(chaptersDir).catch(() => [])).filter((file) => file.endsWith(".md")).length;
    const characters = (await fs.readdir(charactersDir).catch(() => [])).filter((file) => file.endsWith(".json") && file !== "index.json").length;
    const hasBible = await fs.pathExists(projectService.getWorldBiblePath(input.project));
    const hasOutline = await fs.pathExists(path.join(projectService.projectDir(input.project), "outline.json"));
    const hasLore = (await projectService.readLoreFacts(input.project)).length > 0 || await fs.pathExists(path.join(projectService.projectDir(input.project), "lore_facts.json"));

    return messages.infoSummary({
      name: meta.name,
      genre: meta.genre,
      description: meta.description || messages.none,
      created: meta.created,
      hasBible,
      chapters,
      characters,
      hasLore,
      hasOutline,
    });
  }

  if (input.action === "delete") {
    if (!input.project) {
      throw new ScriptoriumError(
        mcpEntry((catalog) => catalog.projectManager.projectNameRequired("delete")),
        "VALIDATION_ERROR",
      );
    }

    const projectDir = projectService.projectDir(input.project);
    if (!await fs.pathExists(projectDir)) {
      throw new ScriptoriumError(
        mcpEntry((catalog) => catalog.projectService.projectNotFound(input.project!)),
        "NOT_FOUND",
      );
    }

    await fs.remove(projectDir);
    logOperation("project_deleted", input.project, { locale });
    eventBus.emitEvent("project.deleted", {
      project: input.project,
      actor: "project_manager",
    });
    return messages.deleteSuccess(input.project);
  }

  if (input.action === "export") {
    if (!input.project) {
      throw new ScriptoriumError(
        mcpEntry((catalog) => catalog.projectManager.projectNameRequired("export")),
        "VALIDATION_ERROR",
      );
    }

    const projectDir = projectService.projectDir(input.project);
    if (!await fs.pathExists(projectDir)) {
      throw new ScriptoriumError(
        mcpEntry((catalog) => catalog.projectService.projectNotFound(input.project!)),
        "NOT_FOUND",
      );
    }

    const exportDir = path.join(projectDir, "exports");
    await fs.ensureDir(exportDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baseName = `${input.project}_${timestamp}`;
    const format = input.format ?? "html";
    const bibleContent = await projectService.readWorldBible(input.project) ?? `${messages.exportPlaceholderTitle(input.project)}\n\n${messages.exportNoBible}`;

    let output = `${messages.exportPlaceholderTitle(input.project)}\n\n${bibleContent}\n\n${messages.exportChaptersHeading}\n`;
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
      logOperation("export_attempted", "epub_fallback", { project: input.project, note: "Pandoc is not invoked automatically.", locale });
    }

    logOperation("export_completed", format, { project: input.project, locale });
    return messages.exportSuccess(input.project, format, path.posix.join("exports", `${baseName}.${extension}`));
  }

  throw new ScriptoriumError(
    mcpEntry((catalog) => catalog.projectManager.unknownAction),
    "VALIDATION_ERROR",
  );
}, "project_manager");
