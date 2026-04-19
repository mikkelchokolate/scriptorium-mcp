import { z } from "zod";
import fs from "fs-extra";
import path from "path";

import { getMcpMessages, mcpEntry } from "../core/i18n/mcp/index.js";
import { SERVER_LOCALE, resolveRequestLocale, withLocaleInput } from "../core/i18n/runtime.js";
import { createProjectService } from "../services/project-service.js";
import eventBus from "../utils/event-bus.js";
import { withErrorHandling, ScriptoriumError, logOperation } from "../utils/error-handler.js";

const ROLE_VALUES = ["protagonist", "antagonist", "supporting", "minor"] as const;
const serverMessages = getMcpMessages(SERVER_LOCALE);

const characterForgerSchemaBase = z.object({
  action: z.enum(["create", "update", "get", "list", "track_arc"]).describe(serverMessages.characterForger.schema.action),
  project: z.string().describe(serverMessages.characterForger.schema.project),
  name: z.string().optional().describe(serverMessages.characterForger.schema.name),
  role: z.enum(ROLE_VALUES).optional().describe(serverMessages.characterForger.schema.role),
  backstory: z.string().optional().describe(serverMessages.characterForger.schema.backstory),
  motivation: z.string().optional().describe(serverMessages.characterForger.schema.motivation),
  arc: z.string().optional().describe(serverMessages.characterForger.schema.arc),
  traits: z.array(z.string()).optional().describe(serverMessages.characterForger.schema.traits),
  arc_stage: z.string().optional().describe(serverMessages.characterForger.schema.arcStage),
  notes: z.string().optional().describe(serverMessages.characterForger.schema.notes),
});

export const characterForgerSchema = withLocaleInput(characterForgerSchemaBase);
export type CharacterForgerInput = z.infer<typeof characterForgerSchema>;

interface CharacterArcStage {
  stage: string;
  notes?: string;
  timestamp: string;
}

interface CharacterRecord {
  name: string;
  role: "protagonist" | "antagonist" | "supporting" | "minor";
  backstory: string;
  motivation: string;
  arc: string;
  traits: string[];
  arc_stages: CharacterArcStage[];
  notes: string;
  created: string;
  updated: string;
}

interface CharacterIndexEntry {
  name: string;
  role: CharacterRecord["role"];
  file: string;
}

type CharacterIndex = Record<string, CharacterIndexEntry>;

function slugifyName(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

export const characterForger = withErrorHandling(async (input: CharacterForgerInput, projectsRoot: string): Promise<string> => {
  const locale = resolveRequestLocale(input);
  const messages = getMcpMessages(locale).characterForger;
  const projectService = createProjectService(projectsRoot);
  await projectService.ensureProjectDirectories(input.project);

  const charactersDir = path.join(projectService.projectDir(input.project), "characters");
  const indexPath = path.join(charactersDir, "index.json");

  const loadIndex = async (): Promise<CharacterIndex> => {
    if (!await fs.pathExists(indexPath)) {
      return {};
    }
    return fs.readJson(indexPath) as Promise<CharacterIndex>;
  };

  const saveIndex = async (index: CharacterIndex): Promise<void> => {
    await projectService.withLock(`characters:index:${input.project}`, () => projectService.writeJsonAtomic(indexPath, index));
  };

  const requireName = (): string => {
    if (!input.name) {
      throw new ScriptoriumError(
        mcpEntry((catalog) => catalog.characterForger.nameRequired),
        "VALIDATION_ERROR",
      );
    }
    return input.name;
  };

  if (input.action === "create") {
    const name = requireName();
    const slug = slugifyName(name);
    const characterPath = path.join(charactersDir, `${slug}.json`);
    const index = await loadIndex();
    const now = new Date().toISOString();

    const character: CharacterRecord = {
      name,
      role: input.role ?? "supporting",
      backstory: input.backstory ?? "",
      motivation: input.motivation ?? "",
      arc: input.arc ?? "",
      traits: input.traits ?? [],
      arc_stages: input.arc_stage ? [{ stage: input.arc_stage, timestamp: now }] : [],
      notes: input.notes ?? "",
      created: now,
      updated: now,
    };

    await projectService.withLock(`character:${input.project}:${slug}`, async () => {
      await projectService.writeJsonAtomic(characterPath, character);
    });

    index[slug] = { name, role: character.role, file: `${slug}.json` };
    await saveIndex(index);
    logOperation("character_created", name, { project: input.project, locale });
    eventBus.emitEvent("character.created", {
      project: input.project,
      actor: "character_forger",
      details: { name, role: character.role, locale },
    });
    return messages.createSuccess(name);
  }

  if (input.action === "update") {
    const name = requireName();
    const slug = slugifyName(name);
    const characterPath = path.join(charactersDir, `${slug}.json`);
    if (!await fs.pathExists(characterPath)) {
      throw new ScriptoriumError(
        mcpEntry((catalog) => catalog.characterForger.notFound(name)),
        "NOT_FOUND",
      );
    }

    const index = await loadIndex();
    const existing = await fs.readJson(characterPath) as CharacterRecord;
    const updated: CharacterRecord = {
      ...existing,
      role: input.role ?? existing.role,
      backstory: input.backstory ?? existing.backstory,
      motivation: input.motivation ?? existing.motivation,
      arc: input.arc ?? existing.arc,
      traits: input.traits ? Array.from(new Set([...existing.traits, ...input.traits])) : existing.traits,
      notes: input.notes ?? existing.notes,
      updated: new Date().toISOString(),
    };

    await projectService.withLock(`character:${input.project}:${slug}`, async () => {
      await projectService.writeJsonAtomic(characterPath, updated);
    });

    index[slug] = { name: updated.name, role: updated.role, file: `${slug}.json` };
    await saveIndex(index);
    logOperation("character_updated", name, { project: input.project, locale });
    eventBus.emitEvent("character.updated", {
      project: input.project,
      actor: "character_forger",
      details: { name, role: updated.role, locale },
    });
    return messages.updateSuccess(name);
  }

  if (input.action === "track_arc") {
    const name = requireName();
    if (!input.arc_stage) {
      throw new ScriptoriumError(
        mcpEntry((catalog) => catalog.characterForger.arcStageRequired),
        "VALIDATION_ERROR",
      );
    }

    const slug = slugifyName(name);
    const characterPath = path.join(charactersDir, `${slug}.json`);
    if (!await fs.pathExists(characterPath)) {
      throw new ScriptoriumError(
        mcpEntry((catalog) => catalog.characterForger.notFound(name)),
        "NOT_FOUND",
      );
    }

    const existing = await fs.readJson(characterPath) as CharacterRecord;
    const updated: CharacterRecord = {
      ...existing,
      arc_stages: [
        ...existing.arc_stages,
        { stage: input.arc_stage, notes: input.notes ?? "", timestamp: new Date().toISOString() },
      ],
      updated: new Date().toISOString(),
    };

    await projectService.withLock(`character:${input.project}:${slug}`, async () => {
      await projectService.writeJsonAtomic(characterPath, updated);
    });

    logOperation("character_arc_tracked", name, { project: input.project, stage: input.arc_stage, locale });
    eventBus.emitEvent("character.updated", {
      project: input.project,
      actor: "character_forger",
      details: { name, arcStage: input.arc_stage, locale },
    });
    return messages.arcTracked(input.arc_stage, name);
  }

  if (input.action === "get") {
    const name = requireName();
    const slug = slugifyName(name);
    const characterPath = path.join(charactersDir, `${slug}.json`);
    if (!await fs.pathExists(characterPath)) {
      throw new ScriptoriumError(
        mcpEntry((catalog) => catalog.characterForger.notFound(name)),
        "NOT_FOUND",
      );
    }
    const character = await fs.readJson(characterPath) as CharacterRecord;
    return JSON.stringify(character, null, 2);
  }

  if (input.action === "list") {
    const index = await loadIndex();
    const entries = Object.values(index);
    if (entries.length === 0) {
      return messages.listEmpty;
    }
    const lines = entries.map((entry) => `- ${entry.name} [${messages.roleLabels[entry.role]}]`);
    return messages.listTitle(input.project, lines.join("\n"));
  }

  throw new ScriptoriumError(
    mcpEntry((catalog) => catalog.characterForger.unknownAction),
    "VALIDATION_ERROR",
  );
}, "character_forger");
