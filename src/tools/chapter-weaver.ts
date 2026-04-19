import { z } from "zod";
import fs from "fs-extra";
import path from "path";
import loreService from "../services/lore-service.js";
import { createProjectService } from "../services/project-service.js";
import { withErrorHandling, ScriptoriumError, logOperation } from "../utils/error-handler.js";

export const chapterWeaverSchema = z.object({
  action: z.enum(["create", "append", "get", "list", "add_cliffhanger"]).describe("Action to perform"),
  project: z.string().describe("Project name/directory"),
  chapter_number: z.number().optional().describe("Chapter number"),
  title: z.string().optional().describe("Chapter title"),
  content: z.string().optional().describe("Chapter content to write or append"),
  pov_character: z.string().optional().describe("POV character for this chapter"),
  location: z.string().optional().describe("Primary location"),
  summary: z.string().optional().describe("Chapter summary/synopsis"),
  cliffhanger: z.string().optional().describe("Cliffhanger ending suggestion"),
});

export type ChapterWeaverInput = z.infer<typeof chapterWeaverSchema>;

interface ChapterIndexEntry {
  number: number;
  title: string;
  file: string;
  pov: string;
  summary: string;
  created: string;
}

function generateCliffhanger(): string {
  const hooks = [
    "The door opened, and the one person they trusted least stepped through it.",
    "The message arrived seconds too late to stop what had already begun.",
    "What looked like a rescue was actually the trap closing.",
    "The answer they needed proved they had been asking the wrong question.",
    "Someone in the room had known the truth from the beginning.",
    "The signal died just as the impossible finally made sense.",
    "The promise that held everything together was no longer true.",
  ];
  return hooks[Math.floor(Math.random() * hooks.length)];
}

export const chapterWeaver = withErrorHandling(async (input: ChapterWeaverInput, projectsRoot: string): Promise<string> => {
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
    const title = input.title ?? `Chapter ${chapterNumber}`;
    const body = input.content ?? "*[Chapter content to be written...]*\n";
    const header = `# ${title}\n**Chapter:** ${chapterNumber}\n**POV:** ${input.pov_character ?? "Narrator"}\n**Location:** ${input.location ?? "Unknown"}\n**Summary:** ${input.summary ?? ""}\n\n---\n\n`;

    await projectService.writeChapter(input.project, chapterNumber, `${header}${body}`);

    const padded = String(chapterNumber).padStart(2, "0");
    const entry: ChapterIndexEntry = {
      number: chapterNumber,
      title,
      file: `chapter_${padded}.md`,
      pov: input.pov_character ?? "Narrator",
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
        return `Chapter ${chapterNumber} "${title}" created.\n\nGraph extension registered ${extraction.registered} extracted entit${extraction.registered === 1 ? "y" : "ies"}.`;
      }
    }

    logOperation("chapter_created", title, { project: input.project, chapter: chapterNumber });
    return `Chapter ${chapterNumber} "${title}" created.`;
  }

  if (input.action === "append") {
    const chapterNumber = input.chapter_number;
    if (!chapterNumber) {
      throw new ScriptoriumError("'chapter_number' is required for append.", "VALIDATION_ERROR");
    }
    const content = input.content ?? "";
    await projectService.appendToChapter(input.project, chapterNumber, content);

    if (content.length > 50 && loreService.isConnected) {
      const extraction = await loreService.autoExtractAndRegisterFacts(content, input.project, chapterNumber);
      if (extraction.registered > 0) {
        return `Content appended to Chapter ${chapterNumber}.\n\nGraph extension registered ${extraction.registered} extracted entit${extraction.registered === 1 ? "y" : "ies"}.`;
      }
    }

    logOperation("chapter_appended", String(chapterNumber), { project: input.project });
    return `Content appended to Chapter ${chapterNumber}.`;
  }

  if (input.action === "add_cliffhanger") {
    const chapterNumber = input.chapter_number;
    if (!chapterNumber) {
      throw new ScriptoriumError("'chapter_number' is required.", "VALIDATION_ERROR");
    }
    const cliffhanger = input.cliffhanger ?? generateCliffhanger();
    await projectService.appendToChapter(input.project, chapterNumber, `\n\n---\n*Cliffhanger:* ${cliffhanger}\n`);
    return `Cliffhanger added to Chapter ${chapterNumber}:\n"${cliffhanger}"`;
  }

  if (input.action === "get") {
    const chapterNumber = input.chapter_number;
    if (!chapterNumber) {
      throw new ScriptoriumError("'chapter_number' is required.", "VALIDATION_ERROR");
    }
    const content = await projectService.readChapter(input.project, chapterNumber);
    if (!content) {
      return `Chapter ${chapterNumber} not found.`;
    }
    return content;
  }

  if (input.action === "list") {
    const index = await loadIndex();
    if (index.length === 0) {
      return "No chapters found. Use 'create' to start writing.";
    }
    const lines = index.map((chapter) => `  Ch.${String(chapter.number).padStart(2, "0")} — ${chapter.title} [POV: ${chapter.pov}]`);
    return `Chapters in "${input.project}" (${index.length} total):\n${lines.join("\n")}`;
  }

  throw new ScriptoriumError("Unknown action for chapter_weaver.", "VALIDATION_ERROR");
}, "chapter_weaver");
