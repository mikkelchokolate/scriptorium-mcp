import { z } from "zod";
import fs from "fs-extra";
import path from "path";

import { getMcpMessages, mcpEntry } from "../core/i18n/mcp/index.js";
import { SERVER_LOCALE, resolveRequestLocale, withLocaleInput } from "../core/i18n/runtime.js";
import loreService from "../services/lore-service.js";
import { createProjectService } from "../services/project-service.js";
import { withErrorHandling, ScriptoriumError, logOperation } from "../utils/error-handler.js";
import eventBus from "../utils/event-bus.js";

const serverMessages = getMcpMessages(SERVER_LOCALE);

const chapterWeaverSchemaBase = z.object({
  action: z.enum(["create", "append", "get", "list", "add_cliffhanger"]).describe(serverMessages.chapterWeaver.schema.action),
  project: z.string().describe(serverMessages.chapterWeaver.schema.project),
  chapter_number: z.number().optional().describe(serverMessages.chapterWeaver.schema.chapterNumber),
  title: z.string().optional().describe(serverMessages.chapterWeaver.schema.title),
  content: z.string().optional().describe(serverMessages.chapterWeaver.schema.content),
  pov_character: z.string().optional().describe(serverMessages.chapterWeaver.schema.povCharacter),
  location: z.string().optional().describe(serverMessages.chapterWeaver.schema.location),
  summary: z.string().optional().describe(serverMessages.chapterWeaver.schema.summary),
  cliffhanger: z.string().optional().describe(serverMessages.chapterWeaver.schema.cliffhanger),
});

export const chapterWeaverSchema = withLocaleInput(chapterWeaverSchemaBase);
export type ChapterWeaverInput = z.infer<typeof chapterWeaverSchema>;

interface ChapterIndexEntry {
  number: number;
  title: string;
  file: string;
  pov: string;
  summary: string;
  created: string;
}

function generateCliffhanger(locale: string): string {
  const messages = getMcpMessages(locale).chapterWeaver;
  return messages.cliffhangers[Math.floor(Math.random() * messages.cliffhangers.length)];
}

export const chapterWeaver = withErrorHandling(async (input: ChapterWeaverInput, projectsRoot: string): Promise<string> => {
  const locale = resolveRequestLocale(input);
  const messages = getMcpMessages(locale).chapterWeaver;
  const projectService = createProjectService(projectsRoot);
  await projectService.ensureProjectDirectories(input.project);

  const chaptersDir = path.join(projectService.projectDir(input.project), "chapters");
  const indexPath = path.join(chaptersDir, "index.json");

  const loadIndex = async (): Promise<ChapterIndexEntry[]> => {
    if (!await fs.pathExists(indexPath)) {
      return [];
    }
    return fs.readJson(indexPath) as Promise<ChapterIndexEntry[]>;
  };

  const saveIndex = async (entries: ChapterIndexEntry[]): Promise<void> => {
    await projectService.withLock(`chapters:index:${input.project}`, () => projectService.writeJsonAtomic(indexPath, entries));
  };

  if (input.action === "create") {
    const index = await loadIndex();
    const chapterNumber = input.chapter_number ?? (index.length + 1);
    const title = input.title ?? messages.defaultTitle(chapterNumber);
    const body = input.content ?? messages.defaultBody;
    const header = `# ${title}
**${messages.headerLabels.chapter}:** ${chapterNumber}
**${messages.headerLabels.pov}:** ${input.pov_character ?? messages.narrator}
**${messages.headerLabels.location}:** ${input.location ?? (locale.startsWith("ru") ? "Неизвестно" : "Unknown")}
**${messages.headerLabels.summary}:** ${input.summary ?? ""}

---

`;

    await projectService.writeChapter(input.project, chapterNumber, `${header}${body}`);

    const padded = String(chapterNumber).padStart(2, "0");
    const entry: ChapterIndexEntry = {
      number: chapterNumber,
      title,
      file: `chapter_${padded}.md`,
      pov: input.pov_character ?? messages.narrator,
      summary: input.summary ?? "",
      created: new Date().toISOString(),
    };

    const existingIndex = index.findIndex((chapter) => chapter.number === chapterNumber);
    if (existingIndex >= 0) {
      index[existingIndex] = entry;
    } else {
      index.push(entry);
      index.sort((left, right) => left.number - right.number);
    }
    await saveIndex(index);

    if (input.content && input.content.length > 50 && loreService.isConnected) {
      const extraction = await loreService.autoExtractAndRegisterFacts(input.content, input.project, chapterNumber);
      if (extraction.registered > 0) {
        return messages.createSuccessWithExtraction(chapterNumber, title, extraction.registered);
      }
    }

    logOperation("chapter_created", title, { project: input.project, chapter: chapterNumber, locale });
    eventBus.emitEvent("chapter.created", {
      project: input.project,
      actor: "chapter_weaver",
      details: { chapter: chapterNumber, title, locale },
    });
    return messages.createSuccess(chapterNumber, title);
  }

  if (input.action === "append") {
    const chapterNumber = input.chapter_number;
    if (!chapterNumber) {
      throw new ScriptoriumError(
        mcpEntry((catalog) => catalog.chapterWeaver.appendChapterRequired),
        "VALIDATION_ERROR",
      );
    }
    const content = input.content ?? "";
    await projectService.appendToChapter(input.project, chapterNumber, content);

    if (content.length > 50 && loreService.isConnected) {
      const extraction = await loreService.autoExtractAndRegisterFacts(content, input.project, chapterNumber);
      if (extraction.registered > 0) {
        return messages.appendSuccessWithExtraction(chapterNumber, extraction.registered);
      }
    }

    logOperation("chapter_appended", String(chapterNumber), { project: input.project, locale });
    eventBus.emitEvent("chapter.appended", {
      project: input.project,
      actor: "chapter_weaver",
      details: { chapter: chapterNumber, contentLength: content.length, locale },
    });
    return messages.appendSuccess(chapterNumber);
  }

  if (input.action === "add_cliffhanger") {
    const chapterNumber = input.chapter_number;
    if (!chapterNumber) {
      throw new ScriptoriumError(
        mcpEntry((catalog) => catalog.chapterWeaver.chapterRequired),
        "VALIDATION_ERROR",
      );
    }
    const cliffhanger = input.cliffhanger ?? generateCliffhanger(locale);
    await projectService.appendToChapter(
      input.project,
      chapterNumber,
      `\n\n---\n*${messages.headerLabels.cliffhanger}:* ${cliffhanger}\n`,
    );
    eventBus.emitEvent("chapter.appended", {
      project: input.project,
      actor: "chapter_weaver",
      details: { chapter: chapterNumber, cliffhanger, locale },
    });
    return messages.cliffhangerAdded(chapterNumber, cliffhanger);
  }

  if (input.action === "get") {
    const chapterNumber = input.chapter_number;
    if (!chapterNumber) {
      throw new ScriptoriumError(
        mcpEntry((catalog) => catalog.chapterWeaver.chapterRequired),
        "VALIDATION_ERROR",
      );
    }
    const content = await projectService.readChapter(input.project, chapterNumber);
    if (!content) {
      return messages.chapterNotFound(chapterNumber);
    }
    return content;
  }

  if (input.action === "list") {
    const index = await loadIndex();
    if (index.length === 0) {
      return messages.listEmpty;
    }

    const lines = index.map((chapter) => locale.startsWith("ru")
      ? `- Гл. ${String(chapter.number).padStart(2, "0")} - ${chapter.title} [POV: ${chapter.pov}]`
      : `- Ch. ${String(chapter.number).padStart(2, "0")} - ${chapter.title} [POV: ${chapter.pov}]`);

    return messages.listTitle(input.project, index.length, lines.join("\n"));
  }

  throw new ScriptoriumError(
    mcpEntry((catalog) => catalog.chapterWeaver.unknownAction),
    "VALIDATION_ERROR",
  );
}, "chapter_weaver");
