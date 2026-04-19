#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

import eventBus from "./utils/event-bus.js";
import pluginService from "./services/plugin-service.js";
import loreService from "./services/lore-service.js";
import { createProjectService } from "./services/project-service.js";
import { GraphQueryService } from "./backend/graph/graph-query-service.js";
import { GraphEventStreamService } from "./backend/graph/graph-event-stream-service.js";
import { GraphApiServer } from "./backend/graph/graph-api-server.js";

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
import { getGenrePrompt, listGenres, GENRE_PROMPTS } from "./prompts/genre-prompts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECTS_ROOT = process.env.SCRIPTORIUM_PROJECTS ?? path.join(__dirname, "..", "projects");
const PLUGINS_DIR = path.join(__dirname, "..", "plugins");
const projectService = createProjectService(PROJECTS_ROOT);
const graphPort = Number(process.env.SCRIPTORIUM_GRAPH_PORT ?? "4319");
const graphHost = process.env.SCRIPTORIUM_GRAPH_HOST ?? "0.0.0.0";

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
  port: Number.isFinite(graphPort) ? graphPort : 4319,
  corsOrigin: process.env.SCRIPTORIUM_GRAPH_CORS_ORIGIN ?? "*",
});

try {
  await graphApiServer.start();
  console.error(`[Scriptorium] Graph Explorer API listening on http://${graphHost}:${Number.isFinite(graphPort) ? graphPort : 4319}`);
} catch (error) {
  console.error(`[Scriptorium] Graph Explorer API unavailable: ${String(error)}`);
}

const server = new McpServer({
  name: "scriptorium",
  version: "1.2.0",
});

server.tool(
  "world_weaver",
  "Create and expand worlds, locations, cultures, core systems and rules, timelines, factions, and themes for a project.",
  worldWeaverSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await worldWeaver(input as z.infer<typeof worldWeaverSchema>, PROJECTS_ROOT) }] }),
);

server.tool(
  "character_forger",
  "Create, update, inspect, and list characters, including arc tracking.",
  characterForgerSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await characterForger(input as z.infer<typeof characterForgerSchema>, PROJECTS_ROOT) }] }),
);

server.tool(
  "story_architect",
  "Create outlines, update beats, inspect an outline, and suggest plot twists.",
  storyArchitectSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await storyArchitect(input as z.infer<typeof storyArchitectSchema>, PROJECTS_ROOT) }] }),
);

server.tool(
  "chapter_weaver",
  "Write, append, inspect, and list chapters, and add cliffhangers.",
  chapterWeaverSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await chapterWeaver(input as z.infer<typeof chapterWeaverSchema>, PROJECTS_ROOT) }] }),
);

server.tool(
  "lore_guardian",
  "Register lore facts, inspect them, and run file-first consistency and timeline checks. Graph support is optional.",
  loreGuardianSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await loreGuardian(input as z.infer<typeof loreGuardianSchema>, PROJECTS_ROOT) }] }),
);

server.tool(
  "prose_alchemist",
  "Edit prose, preserve author voice, suggest variants, and check style consistency.",
  proseAlchemistSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await proseAlchemist(input as any, PROJECTS_ROOT) }] }),
);

server.tool(
  "series_planner",
  "Plan multi-book series, titles, blurbs, and progression.",
  seriesPlannerSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await seriesPlanner(input as any, PROJECTS_ROOT) }] }),
);

server.tool(
  "beta_reader",
  "Simulate reader feedback personas for an excerpt.",
  betaReaderSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await betaReader(input as any) }] }),
);

server.tool(
  "research_quill",
  "Research topics, fact-check claims, and manage bibliography entries.",
  researchQuillSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await researchQuill(input as any, PROJECTS_ROOT) }] }),
);

server.tool(
  "project_manager",
  "Create, list, inspect, delete, and export file-backed book projects. The canonical project bible file is world_bible.md.",
  projectManagerSchema.shape,
  async (input) => ({ content: [{ type: "text", text: await projectManager(input as z.infer<typeof projectManagerSchema>, PROJECTS_ROOT) }] }),
);

server.tool(
  "genre_prompt",
  "Get writing prompt guidance for a supported genre.",
  {
    action: z.enum(["get", "list"]).describe("'get' a specific genre prompt or 'list' all available genres"),
    genre: z.string().optional().describe("Genre key (e.g., 'grimdark_fantasy', 'litrpg')"),
  },
  async ({ action, genre }) => {
    const result = action === "list" ? listGenres() : getGenrePrompt(genre ?? "");
    return { content: [{ type: "text", text: result }] };
  },
);

server.resource(
  "world_bible",
  "scriptorium://project/{project}/world_bible",
  async (uri) => {
    const match = uri.href.match(/project\/([^/]+)\/world_bible/);
    if (!match) {
      return { contents: [{ uri: uri.href, text: "Invalid URI" }] };
    }

    const project = match[1];
    const text = await projectService.readWorldBible(project) ?? "No World Bible found. Create one with project_manager or world_weaver.";
    return { contents: [{ uri: uri.href, mimeType: "text/markdown", text }] };
  },
);

server.resource(
  "characters",
  "scriptorium://project/{project}/characters",
  async (uri) => {
    const match = uri.href.match(/project\/([^/]+)\/characters/);
    if (!match) {
      return { contents: [{ uri: uri.href, text: "Invalid URI" }] };
    }

    const indexPath = path.join(PROJECTS_ROOT, match[1], "characters", "index.json");
    const text = await fs.pathExists(indexPath) ? JSON.stringify(await fs.readJson(indexPath), null, 2) : "No characters found.";
    return { contents: [{ uri: uri.href, mimeType: "application/json", text }] };
  },
);

server.resource(
  "outline",
  "scriptorium://project/{project}/outline",
  async (uri) => {
    const match = uri.href.match(/project\/([^/]+)\/outline/);
    if (!match) {
      return { contents: [{ uri: uri.href, text: "Invalid URI" }] };
    }

    const filePath = path.join(PROJECTS_ROOT, match[1], "outline.json");
    const text = await fs.pathExists(filePath) ? JSON.stringify(await fs.readJson(filePath), null, 2) : "No outline found.";
    return { contents: [{ uri: uri.href, mimeType: "application/json", text }] };
  },
);

server.resource(
  "lore_facts",
  "scriptorium://project/{project}/lore_facts",
  async (uri) => {
    const match = uri.href.match(/project\/([^/]+)\/lore_facts/);
    if (!match) {
      return { contents: [{ uri: uri.href, text: "Invalid URI" }] };
    }

    const text = JSON.stringify(await projectService.readLoreFacts(match[1]), null, 2);
    return { contents: [{ uri: uri.href, mimeType: "application/json", text }] };
  },
);

server.prompt(
  "new_book_session",
  "Start a new book writing session with Scriptorium",
  {
    project: z.string().describe("Project name"),
    genre: z.string().optional().describe("Genre"),
  },
  async ({ project, genre }) => {
    const genreGuide = genre ? getGenrePrompt(genre) : listGenres();
    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `I'm starting a new book project called "${project}"${genre ? ` in the ${genre} genre` : ""}.

Use Scriptorium's file-backed tools to help me:
1. Set up the project with project_manager
2. Build the world with world_weaver
3. Create key characters with character_forger
4. Build the outline with story_architect

${genreGuide}`,
        },
      }],
    };
  },
);

server.prompt(
  "genre_writing_session",
  "Start a genre-specific writing session",
  { genre: z.string().describe("Genre key (e.g., grimdark_fantasy, litrpg)") },
  async ({ genre }) => {
    const guide = GENRE_PROMPTS[genre];
    if (!guide) {
      return { messages: [{ role: "user", content: { type: "text", text: `Genre "${genre}" not found. ${listGenres()}` } }] };
    }

    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `${guide.system_prompt}

I'm writing a ${guide.name} novel. Use Scriptorium's available tools when they help structure the project.

Key tropes to leverage: ${guide.tropes.join(", ")}
Things to avoid: ${guide.avoid.join(", ")}`,
        },
      }],
    };
  },
);

server.prompt(
  "consistency_check_session",
  "Run a consistency check on a project",
  { project: z.string().describe("Project name") },
  async ({ project }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please review project "${project}" with lore_guardian.
1. List registered lore facts
2. Check the timeline for gaps or contradictions
3. Review for possible naming or continuity issues
4. Summarize the findings clearly`,
      },
    }],
  }),
);

server.tool(
  "plugin_manager",
  "Inspect optional ontology plugins that extend the core file-backed workspace.",
  {
    action: z.enum(["list", "get", "reload", "entity_types", "relation_types", "consistency_rules"]).describe("Action to perform"),
    plugin_name: z.string().optional().describe("Name of the plugin to inspect"),
  },
  async ({ action, plugin_name }) => {
    await pluginService.ensureLoaded();

    if (action === "list") {
      return { content: [{ type: "text", text: pluginService.listPluginsSummary() }] };
    }

    if (action === "get") {
      if (!plugin_name) {
        return { content: [{ type: "text", text: "Error: 'plugin_name' is required." }] };
      }
      const plugin = pluginService.getPlugin(plugin_name);
      if (!plugin) {
        return { content: [{ type: "text", text: `Plugin "${plugin_name}" not found. Use 'list' to see available plugins.` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(plugin, null, 2) }] };
    }

    if (action === "reload") {
      await pluginService.loadPlugins(PLUGINS_DIR);
      return { content: [{ type: "text", text: pluginService.listPluginsSummary() }] };
    }

    if (action === "entity_types") {
      const types = pluginService.getAllEntityTypes();
      if (types.length === 0) {
        return { content: [{ type: "text", text: "No entity types defined in any loaded plugin." }] };
      }
      const lines = types.map((type) => `  - ${type.name}: ${type.description}${type.properties ? `\n    Properties: ${type.properties.join(", ")}` : ""}`);
      return { content: [{ type: "text", text: `All Entity Types from Optional Plugins (${types.length}):\n\n${lines.join("\n\n")}` }] };
    }

    if (action === "relation_types") {
      const types = pluginService.getAllRelationTypes();
      if (types.length === 0) {
        return { content: [{ type: "text", text: "No relation types defined in any loaded plugin." }] };
      }
      const lines = types.map((type) => `  - ${type.name}: ${type.from} → ${type.to}${type.description ? ` (${type.description})` : ""}`);
      return { content: [{ type: "text", text: `All Relation Types from Optional Plugins (${types.length}):\n\n${lines.join("\n")}` }] };
    }

    if (action === "consistency_rules") {
      const rules = pluginService.getAllConsistencyRules();
      if (rules.length === 0) {
        return { content: [{ type: "text", text: "No consistency rules defined in any loaded plugin." }] };
      }
      const lines = rules.map((rule) => `  - [${rule.severity.toUpperCase()}] ${rule.id}: ${rule.description}`);
      return { content: [{ type: "text", text: `Consistency Rules from Optional Plugins (${rules.length}):\n\n${lines.join("\n")}` }] };
    }

    return { content: [{ type: "text", text: "Unknown action." }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[Scriptorium] MCP server running. Core mode is file-backed projects; graph and ontology features remain optional extensions.`);
