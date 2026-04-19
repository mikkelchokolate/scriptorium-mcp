import { z } from "zod";
import fs from "fs-extra";
import path from "path";

import { getMcpMessages, mcpEntry } from "../core/i18n/mcp/index.js";
import { SERVER_LOCALE, resolveRequestLocale, withLocaleInput } from "../core/i18n/runtime.js";
import { createProjectService } from "../services/project-service.js";
import eventBus from "../utils/event-bus.js";
import { withErrorHandling, ScriptoriumError, logOperation } from "../utils/error-handler.js";

const STRUCTURE_VALUES = ["three_act", "heros_journey", "save_the_cat", "seven_point", "fichtean_curve"] as const;
const serverMessages = getMcpMessages(SERVER_LOCALE);

const storyArchitectSchemaBase = z.object({
  action: z.enum(["create_outline", "get_outline", "add_beat", "suggest_twist"]).describe(serverMessages.storyArchitect.schema.action),
  project: z.string().describe(serverMessages.storyArchitect.schema.project),
  structure: z.enum(STRUCTURE_VALUES).optional().describe(serverMessages.storyArchitect.schema.structure),
  title: z.string().optional().describe(serverMessages.storyArchitect.schema.title),
  premise: z.string().optional().describe(serverMessages.storyArchitect.schema.premise),
  beat: z.object({
    act: z.string(),
    name: z.string(),
    description: z.string(),
  }).optional().describe(serverMessages.storyArchitect.schema.beat),
  context: z.string().optional().describe(serverMessages.storyArchitect.schema.context),
});

export const storyArchitectSchema = withLocaleInput(storyArchitectSchemaBase);
export type StoryArchitectInput = z.infer<typeof storyArchitectSchema>;

interface OutlineBeat {
  name: string;
  description: string;
  completed: boolean;
  act?: string;
}

interface StoryOutline {
  title: string;
  premise: string;
  structure: (typeof STRUCTURE_VALUES)[number];
  beats: OutlineBeat[];
  created: string;
  updated: string;
}

function hashText(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function selectDeterministicTwists(context: string, locale: string): string[] {
  const templates = getMcpMessages(locale).storyArchitect.twistTemplates;
  const seed = hashText(context || "story_architect");
  const start = seed % templates.length;
  return Array.from({ length: 3 }, (_, offset) => templates[(start + offset) % templates.length]);
}

export const storyArchitect = withErrorHandling(async (input: StoryArchitectInput, projectsRoot: string): Promise<string> => {
  const locale = resolveRequestLocale(input);
  const messages = getMcpMessages(locale).storyArchitect;
  const projectService = createProjectService(projectsRoot);
  await projectService.ensureProjectDirectories(input.project);

  const outlinePath = path.join(projectService.projectDir(input.project), "outline.json");
  const readOutline = async (): Promise<StoryOutline | null> => {
    if (!await fs.pathExists(outlinePath)) {
      return null;
    }
    return fs.readJson(outlinePath) as Promise<StoryOutline>;
  };

  if (input.action === "create_outline") {
    const structure = input.structure ?? "three_act";
    const beats: OutlineBeat[] = messages.structures[structure].map((name) => ({ name, description: "", completed: false }));
    const now = new Date().toISOString();
    const outline: StoryOutline = {
      title: input.title ?? messages.outlineUntitled,
      premise: input.premise ?? "",
      structure,
      beats,
      created: now,
      updated: now,
    };

    await projectService.withLock(`outline:${input.project}`, () => projectService.writeJsonAtomic(outlinePath, outline));
    logOperation("outline_created", outline.title, { project: input.project, structure, locale });
    eventBus.emitEvent("outline.updated", {
      project: input.project,
      actor: "story_architect",
      details: { action: input.action, structure, title: outline.title, locale },
    });
    return messages.createSuccess(structure, outline.title);
  }

  if (input.action === "get_outline") {
    const outline = await readOutline();
    if (!outline) {
      return messages.noOutline;
    }
    const beatList = outline.beats
      .map((beat, index) => `  ${index + 1}. [${beat.completed ? "x" : " "}] ${beat.name}${beat.description ? `: ${beat.description}` : ""}`)
      .join("\n");
    return messages.outlineHeading(outline.title, outline.premise, outline.structure, beatList);
  }

  if (input.action === "add_beat") {
    if (!input.beat) {
      throw new ScriptoriumError(
        mcpEntry((catalog) => catalog.storyArchitect.beatRequired),
        "VALIDATION_ERROR",
      );
    }

    const outline = await readOutline();
    if (!outline) {
      return messages.noOutline;
    }

    const beatName = input.beat.name.toLowerCase();
    const existingIndex = outline.beats.findIndex((beat) => beat.name.toLowerCase() === beatName || beat.name.toLowerCase().includes(beatName));

    if (existingIndex >= 0) {
      outline.beats[existingIndex] = {
        ...outline.beats[existingIndex],
        description: input.beat.description,
        act: input.beat.act,
        completed: true,
      };
    } else {
      outline.beats.push({
        name: input.beat.name,
        description: input.beat.description,
        act: input.beat.act,
        completed: true,
      });
    }

    outline.updated = new Date().toISOString();
    await projectService.withLock(`outline:${input.project}`, () => projectService.writeJsonAtomic(outlinePath, outline));
    logOperation("outline_beat_added", input.beat.name, { project: input.project, locale });
    eventBus.emitEvent("outline.updated", {
      project: input.project,
      actor: "story_architect",
      details: { action: input.action, beat: input.beat.name, locale },
    });
    return messages.beatUpdated(input.beat.name);
  }

  if (input.action === "suggest_twist") {
    const context = input.context ?? `${input.project}:${input.title ?? ""}:${input.premise ?? ""}`;
    const twists = selectDeterministicTwists(context, locale);
    return messages.twistHeading(input.context, twists);
  }

  throw new ScriptoriumError(
    mcpEntry((catalog) => catalog.storyArchitect.unknownAction),
    "VALIDATION_ERROR",
  );
}, "story_architect");
