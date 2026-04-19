# Scriptorium MCP

Scriptorium MCP is a file-first writing workspace for fiction projects. It exposes MCP tools for managing projects, world bibles, characters, chapters, outlines, lore facts, and optional graph-backed exploration via Neo4j.

## What it includes

- TypeScript MCP server over stdio
- File-backed project storage under `projects/`
- Writing tools for world-building, outlining, chapter work, character management, and lore checks
- Optional ontology plugins loaded from `plugins/`
- Optional Neo4j graph enrichment for entities, relations, contradictions, and timeline views

## Core tools

- `project_manager`
- `world_weaver`
- `character_forger`
- `story_architect`
- `chapter_weaver`
- `lore_guardian`
- `prose_alchemist`
- `series_planner`
- `beta_reader`
- `research_quill`
- `plugin_manager`
- `genre_prompt`

## Development

Requirements:

- Node.js 22+
- npm
- Optional: Neo4j 5.x for graph features

Install and run:

```bash
npm install
npm run build
npm start
```

For local development:

```bash
npm run dev
```

## Docker

The repository includes `Dockerfile` and `docker-compose.yml` for running the MCP server with an optional Neo4j service.

## Repository layout

- `src/` application source
- `plugins/` optional ontology definitions
- `plans/` architecture and roadmap notes
- `projects/` local runtime workspace data (kept out of git by default)

## Notes

- `projects/` is intentionally gitignored so local book data and exports do not get published accidentally.
- The server works in file-backed mode even when Neo4j is unavailable.
