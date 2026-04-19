#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

import { getMcpMessages } from "./core/i18n/mcp/index.js";
import { SERVER_LOCALE, resolveRequestLocale, withLocaleInput } from "./core/i18n/runtime.js";
import eventBus from "./utils/event-bus.js";
import pluginService from "./services/plugin-service.js";
import loreService from "./services/lore-service.js";
import { createProjectService } from "./services/project-service.js";
import { GraphQueryService } from "./backend/graph/graph-query-service.js";
import { GraphEventStreamService } from "./backend/graph/graph-event-stream-service.js";
import { GraphApiServer } from "./backend/graph/graph-api-server.js";
import {
  maybeAutoStartWebExplorer,
  readGraphCapabilities,
  replaceStaleGraphApiOnWindows,
  type ManagedWebExplorer,
} from "./utils/local-runtime.js";

import { worldWeaver, worldWeaverSchema } from "./tools/world-weaver.js";
import { characterForger, characterForgerSchema } from "./tools/character-forger.js";
import { storyArchitect, storyArchitectSchema } from "./tools/story-architect.js";
import { chapterWeaver, chapterWeaverSchema } from "./tools/chapter-weaver.js";
import { loreGuardian, loreGuardianSchema } from "./tools/lore-guardian.js";
import { proseAlchemist, proseAlchemistSchema } from "./tools/prose-alchemist.js";
import { seriesPlanner, seriesPlannerSchema } from "./tools/series-planner.js";
import { betaReader, betaReaderSchema } from "./tools/beta-reader.js";
import { researchQuill, researchQuillSchema } from "./tools/research-quill.js";
import { projectManager, projectManagerSchema } from "./tools/project-manager.js";
import { getGenreGuide, getGenrePrompt, listGenres } from "./prompts/genre-prompts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const PROJECTS_ROOT = process.env.SCRIPTORIUM_PROJECTS ?? path.join(REPO_ROOT, "projects");
const PLUGINS_DIR = path.join(REPO_ROOT, "plugins");
const projectService = createProjectService(PROJECTS_ROOT);
const graphPort = Number(process.env.SCRIPTORIUM_GRAPH_PORT ?? "4319");
const graphHost = process.env.SCRIPTORIUM_GRAPH_HOST ?? "0.0.0.0";
const serverMessages = getMcpMessages(SERVER_LOCALE).server;
const resolvedGraphPort = Number.isFinite(graphPort) ? graphPort : 4319;

function resourceLocale(uri: URL): string {
  return resolveRequestLocale({ locale: uri.searchParams.get("locale") ?? undefined });
}

function graphProbeBaseUrl(host: string, port: number): string {
  if (host === "0.0.0.0") return `http://127.0.0.1:${port}`;
  if (host === "::") return `http://[::1]:${port}`;
  return `http://${host}:${port}`;
}

async function isExistingGraphApiAvailable(host: string, port: number): Promise<boolean> {
  const payload = await readGraphCapabilities(graphProbeBaseUrl(host, port));
  return Boolean(
    payload
    && Array.isArray(payload.locales)
    && typeof payload.defaultLocale === "string"
    && payload.websocketPath === "/ws/projects/:project/graph"
    && payload.projectsPath === "/api/projects",
  );
}

await fs.ensureDir(PROJECTS_ROOT);
loreService.configure({ eventBus });

try {
  await pluginService.loadPlugins(PLUGINS_DIR);
  console.error(`[Scriptorium] Optional ontology plugins loaded: ${pluginService.getAllPlugins().length}`);
} catch (error) {
  console.error(`[Scriptorium] Optional ontology plugins unavailable: ${String(error)}`);
}

try {
  await loreService.connect();
  console.error(`[Scriptorium] Optional graph extension ${loreService.isConnected ? "connected" : "not available; using file-backed mode"}.`);
} catch (error) {
  console.error(`[Scriptorium] Optional graph extension unavailable: ${String(error)}`);
}

const graphQueryService = new GraphQueryService(PROJECTS_ROOT, projectService, loreService);
const graphEventStreamService = new GraphEventStreamService(graphQueryService, eventBus);
const graphApiServer = new GraphApiServer(graphQueryService, graphEventStreamService, {
  host: graphHost,
  port: resolvedGraphPort,
  corsOrigin: process.env.SCRIPTORIUM_GRAPH_CORS_ORIGIN ?? "*",
});

try {
  await graphApiServer.start();
  console.error(`[Scriptorium] Graph Explorer API listening on http://${graphHost}:${resolvedGraphPort}`);
} catch (error) {
  const errorCode = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  if (errorCode === "EADDRINUSE" && await isExistingGraphApiAvailable(graphHost, resolvedGraphPort)) {
    const existingCapabilities = await readGraphCapabilities(graphProbeBaseUrl(graphHost, resolvedGraphPort));
    const replaced = await replaceStaleGraphApiOnWindows({
      port: resolvedGraphPort,
      projectRoot: REPO_ROOT,
      currentHasNeo4j: loreService.isConnected,
      existingCapabilities,
    });

    if (replaced) {
      await graphApiServer.start();
      console.error(`[Scriptorium] Replaced stale Graph Explorer API and rebound http://${graphHost}:${resolvedGraphPort}`);
    } else {
      console.error(`[Scriptorium] Graph Explorer API already running at ${graphProbeBaseUrl(graphHost, resolvedGraphPort)}; reusing existing instance.`);
    }
  } else {
    console.error(`[Scriptorium] Graph Explorer API unavailable: ${String(error)}`);
  }
}

const managedWebExplorer = await maybeAutoStartWebExplorer({
  projectRoot: REPO_ROOT,
  graphHttpUrl: graphProbeBaseUrl(graphHost, resolvedGraphPort),
  host: process.env.SCRIPTORIUM_WEB_HOST,
  port: Number(process.env.SCRIPTORIUM_WEB_PORT ?? "3000"),
});

if (managedWebExplorer?.pid) {
  console.error(`[Scriptorium] Web Explorer listening via child process on http://${process.env.SCRIPTORIUM_WEB_HOST ?? "127.0.0.1"}:${process.env.SCRIPTORIUM_WEB_PORT ?? "3000"}`);
}

function registerRuntimeCleanup(options: {
  graphApiServer: GraphApiServer;
  managedWebExplorer: ManagedWebExplorer | null;
}): void {
  let shuttingDown = false;

  const shutdown = async (exitCode?: number) => {
    if (shuttingDown) return;
    shuttingDown = true;

    try {
      await options.managedWebExplorer?.close();
    } catch {
      // Best-effort shutdown.
    }

    try {
      await options.graphApiServer.close();
    } catch {
      // Best-effort shutdown.
    }

    try {
      await loreService.close();
    } catch {
      // Best-effort shutdown.
    }

    if (typeof exitCode === "number") {
      process.exit(exitCode);
    }
  };

  const shutdownSync = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    options.managedWebExplorer?.closeSync();
  };

  process.once("SIGINT", () => { void shutdown(0); });
  process.once("SIGTERM", () => { void shutdown(0); });
  process.once("SIGHUP", () => { void shutdown(0); });
  process.once("beforeExit", () => { void shutdown(); });
  process.once("exit", shutdownSync);
}

registerRuntimeCleanup({
  graphApiServer,
  managedWebExplorer,
});

const server = new McpServer({
  name: "scriptorium",
  version: "1.2.0",
});

server.tool(
  "world_weaver",
  serverMessages.toolDescriptions.worldWeaver,
  worldWeaverSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await worldWeaver(input as z.infer<typeof worldWeaverSchema>, PROJECTS_ROOT) }] }),
);

server.tool(
  "character_forger",
  serverMessages.toolDescriptions.characterForger,
  characterForgerSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await characterForger(input as z.infer<typeof characterForgerSchema>, PROJECTS_ROOT) }] }),
);

server.tool(
  "story_architect",
  serverMessages.toolDescriptions.storyArchitect,
  storyArchitectSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await storyArchitect(input as z.infer<typeof storyArchitectSchema>, PROJECTS_ROOT) }] }),
);

server.tool(
  "chapter_weaver",
  serverMessages.toolDescriptions.chapterWeaver,
  chapterWeaverSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await chapterWeaver(input as z.infer<typeof chapterWeaverSchema>, PROJECTS_ROOT) }] }),
);

server.tool(
  "lore_guardian",
  serverMessages.toolDescriptions.loreGuardian,
  loreGuardianSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await loreGuardian(input as z.infer<typeof loreGuardianSchema>, PROJECTS_ROOT) }] }),
);

server.tool(
  "prose_alchemist",
  serverMessages.toolDescriptions.proseAlchemist,
  proseAlchemistSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await proseAlchemist(input as z.infer<typeof proseAlchemistSchema>, PROJECTS_ROOT) }] }),
);

server.tool(
  "series_planner",
  serverMessages.toolDescriptions.seriesPlanner,
  seriesPlannerSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await seriesPlanner(input as z.infer<typeof seriesPlannerSchema>, PROJECTS_ROOT) }] }),
);

server.tool(
  "beta_reader",
  serverMessages.toolDescriptions.betaReader,
  betaReaderSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await betaReader(input as z.infer<typeof betaReaderSchema>) }] }),
);

server.tool(
  "research_quill",
  serverMessages.toolDescriptions.researchQuill,
  researchQuillSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await researchQuill(input as z.infer<typeof researchQuillSchema>, PROJECTS_ROOT) }] }),
);

server.tool(
  "project_manager",
  serverMessages.toolDescriptions.projectManager,
  projectManagerSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await projectManager(input as z.infer<typeof projectManagerSchema>, PROJECTS_ROOT) }] }),
);

const genrePromptSchema = withLocaleInput(z.object({
  action: z.enum(["get", "list"]).describe(serverMessages.genrePromptTool.action),
  genre: z.string().optional().describe(serverMessages.genrePromptTool.genre),
}));

server.tool(
  "genre_prompt",
  serverMessages.toolDescriptions.genrePrompt,
  genrePromptSchema.shape,
  async (input) => {
    const locale = resolveRequestLocale(input);
    const result = input.action === "list" ? listGenres(locale) : getGenrePrompt(input.genre ?? "", locale);
    return { content: [{ type: "text", text: result }] };
  },
);

server.resource(
  "world_bible",
  "scriptorium://project/{project}/world_bible",
  async (uri) => {
    const messages = getMcpMessages(resourceLocale(uri)).server.resources;
    const match = uri.href.match(/project\/([^/]+)\/world_bible/);
    if (!match) {
      return { contents: [{ uri: uri.href, text: messages.invalidUri }] };
    }

    const project = match[1];
    const text = await projectService.readWorldBible(project) ?? messages.noWorldBible;
    return { contents: [{ uri: uri.href, mimeType: "text/markdown", text }] };
  },
);

server.resource(
  "characters",
  "scriptorium://project/{project}/characters",
  async (uri) => {
    const messages = getMcpMessages(resourceLocale(uri)).server.resources;
    const match = uri.href.match(/project\/([^/]+)\/characters/);
    if (!match) {
      return { contents: [{ uri: uri.href, text: messages.invalidUri }] };
    }

    const indexPath = path.join(PROJECTS_ROOT, match[1], "characters", "index.json");
    const text = await fs.pathExists(indexPath) ? JSON.stringify(await fs.readJson(indexPath), null, 2) : messages.noCharacters;
    return { contents: [{ uri: uri.href, mimeType: "application/json", text }] };
  },
);

server.resource(
  "outline",
  "scriptorium://project/{project}/outline",
  async (uri) => {
    const messages = getMcpMessages(resourceLocale(uri)).server.resources;
    const match = uri.href.match(/project\/([^/]+)\/outline/);
    if (!match) {
      return { contents: [{ uri: uri.href, text: messages.invalidUri }] };
    }

    const filePath = path.join(PROJECTS_ROOT, match[1], "outline.json");
    const text = await fs.pathExists(filePath) ? JSON.stringify(await fs.readJson(filePath), null, 2) : messages.noOutline;
    return { contents: [{ uri: uri.href, mimeType: "application/json", text }] };
  },
);

server.resource(
  "lore_facts",
  "scriptorium://project/{project}/lore_facts",
  async (uri) => {
    const messages = getMcpMessages(resourceLocale(uri)).server.resources;
    const match = uri.href.match(/project\/([^/]+)\/lore_facts/);
    if (!match) {
      return { contents: [{ uri: uri.href, text: messages.invalidUri }] };
    }

    const text = JSON.stringify(await projectService.readLoreFacts(match[1]), null, 2);
    return { contents: [{ uri: uri.href, mimeType: "application/json", text }] };
  },
);

const newBookPromptSchema = withLocaleInput(z.object({
  project: z.string().describe(serverMessages.prompts.newBookProject),
  genre: z.string().optional().describe(serverMessages.prompts.newBookGenre),
}));

server.prompt(
  "new_book_session",
  serverMessages.prompts.newBookDescription,
  newBookPromptSchema.shape,
  async ({ project, genre, locale }) => {
    const resolvedLocale = resolveRequestLocale({ locale });
    const messages = getMcpMessages(resolvedLocale).server.prompts;
    const genreGuide = genre ? getGenrePrompt(genre, resolvedLocale) : listGenres(resolvedLocale);
    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: messages.newBookBody(project, genre, genreGuide),
        },
      }],
    };
  },
);

const genreWritingPromptSchema = withLocaleInput(z.object({
  genre: z.string().describe(serverMessages.prompts.genreWritingGenre),
}));

server.prompt(
  "genre_writing_session",
  serverMessages.prompts.genreWritingDescription,
  genreWritingPromptSchema.shape,
  async ({ genre, locale }) => {
    const resolvedLocale = resolveRequestLocale({ locale });
    const messages = getMcpMessages(resolvedLocale).server.prompts;
    const guide = getGenreGuide(genre, resolvedLocale);
    if (!guide) {
      return { messages: [{ role: "user", content: { type: "text", text: messages.genreNotFound(genre, listGenres(resolvedLocale)) } }] };
    }

    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: messages.genreWritingBody({
            systemPrompt: guide.systemPrompt,
            name: guide.name,
            tropes: guide.tropes,
            avoid: guide.avoid,
          }),
        },
      }],
    };
  },
);

const consistencyPromptSchema = withLocaleInput(z.object({
  project: z.string().describe(serverMessages.prompts.consistencyProject),
}));

server.prompt(
  "consistency_check_session",
  serverMessages.prompts.consistencyDescription,
  consistencyPromptSchema.shape,
  async ({ project, locale }) => {
    const resolvedLocale = resolveRequestLocale({ locale });
    const messages = getMcpMessages(resolvedLocale).server.prompts;
    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: messages.consistencyBody(project),
        },
      }],
    };
  },
);

const pluginManagerSchema = withLocaleInput(z.object({
  action: z.enum(["list", "get", "reload", "entity_types", "relation_types", "consistency_rules"]).describe(serverMessages.pluginManager.action),
  plugin_name: z.string().optional().describe(serverMessages.pluginManager.pluginName),
}));

server.tool(
  "plugin_manager",
  serverMessages.toolDescriptions.pluginManager,
  pluginManagerSchema.shape,
  async (input) => {
    const locale = resolveRequestLocale(input);
    const messages = getMcpMessages(locale).server.pluginManager;
    await pluginService.ensureLoaded();

    if (input.action === "list") {
      return { content: [{ type: "text", text: pluginService.listPluginsSummary(locale) }] };
    }

    if (input.action === "get") {
      if (!input.plugin_name) {
        return { content: [{ type: "text", text: messages.pluginNameRequired }] };
      }
      const plugin = pluginService.getPlugin(input.plugin_name);
      if (!plugin) {
        return { content: [{ type: "text", text: messages.pluginNotFound(input.plugin_name) }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(plugin, null, 2) }] };
    }

    if (input.action === "reload") {
      await pluginService.loadPlugins(PLUGINS_DIR);
      return { content: [{ type: "text", text: pluginService.listPluginsSummary(locale) }] };
    }

    if (input.action === "entity_types") {
      const types = pluginService.getAllEntityTypes();
      if (types.length === 0) {
        return { content: [{ type: "text", text: messages.noEntityTypes }] };
      }
      const lines = types.map((type) => `  - ${type.name}: ${type.description}${type.properties ? `\n    ${locale.startsWith("ru") ? "РЎРІРѕР№СЃС‚РІР°" : "Properties"}: ${type.properties.join(", ")}` : ""}`);
      return { content: [{ type: "text", text: messages.entityTypesTitle(types.length, lines.join("\n\n")) }] };
    }

    if (input.action === "relation_types") {
      const types = pluginService.getAllRelationTypes();
      if (types.length === 0) {
        return { content: [{ type: "text", text: messages.noRelationTypes }] };
      }
      const lines = types.map((type) => `  - ${type.name}: ${type.from} -> ${type.to}${type.description ? ` (${type.description})` : ""}`);
      return { content: [{ type: "text", text: messages.relationTypesTitle(types.length, lines.join("\n")) }] };
    }

    if (input.action === "consistency_rules") {
      const rules = pluginService.getAllConsistencyRules();
      if (rules.length === 0) {
        return { content: [{ type: "text", text: messages.noConsistencyRules }] };
      }
      const lines = rules.map((rule) => `  - [${rule.severity.toUpperCase()}] ${rule.id}: ${rule.description}`);
      return { content: [{ type: "text", text: messages.consistencyRulesTitle(rules.length, lines.join("\n")) }] };
    }

    return { content: [{ type: "text", text: messages.unknownAction }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[Scriptorium] MCP server running. Core mode is file-backed projects; graph and ontology features remain optional extensions.");
