# Scriptorium MCP

Scriptorium MCP is a file-first writing workspace for fiction projects. It exposes MCP tools for managing projects, world bibles, characters, chapters, outlines, lore facts, and optional graph-backed exploration via Neo4j.

## What it includes

- TypeScript MCP server over stdio
- Dedicated HTTP + WebSocket graph service for live browser clients
- File-backed project storage under `projects/`
- Writing tools for world-building, outlining, chapter work, character management, and lore checks
- Optional ontology plugins loaded from `plugins/`
- Optional Neo4j graph enrichment for entities, relations, contradictions, and timeline views
- Temporal and causal forecast layer for detecting near-future plot-hole risk
- Next.js + React Flow web explorer under `web/`

## Public Showcase

- GitHub Pages showcase: `https://mikkelchokolate.github.io/scriptorium-mcp/`
- Static site source: `docs/`
- The Pages site is a polished public walkthrough; the live explorer itself still runs against the local or hosted graph API and WebSocket service

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

Install and run the backend:

```bash
npm install
npm run build
npm start
```

For local backend development:

```bash
npm run dev
```

Recommended local graph setup:

1. Install Docker Desktop.
2. Create a local env file from `.env.example` or use the prefilled values below.
3. Start only Neo4j:

```bash
npm run neo4j:up
```

4. Run Scriptorium locally:

```bash
npm run dev
```

This keeps `Neo4j` containerized while the MCP server, file-backed `projects/`, and local editing workflow continue to run directly from your checkout.

Example `.env.local`:

```bash
SCRIPTORIUM_GRAPH_HOST=0.0.0.0
SCRIPTORIUM_GRAPH_PORT=4319
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=scriptorium_password
```

Build the full stack:

```bash
npm run build:all
```

Run the web explorer:

```bash
cd web
npm install
npm run dev
```

The graph service defaults to `http://localhost:4319` and the Next.js app can connect to it with:

```bash
NEXT_PUBLIC_SCRIPTORIUM_GRAPH_HTTP_URL=http://localhost:4319
NEXT_PUBLIC_SCRIPTORIUM_GRAPH_WS_URL=ws://localhost:4319
```

## Graph API

The backend now exposes a live graph capability layer alongside MCP:

- `GET /api/capabilities`
- `GET /api/projects`
- `GET /api/projects/:project/graph?locale=en|ru`
- `GET /api/projects/:project/graph/timeline?locale=en|ru`
- `GET /api/projects/:project/graph/forecast?locale=en|ru&horizon=10`
- `WS /ws/projects/:project/graph?locale=en|ru`

## Docker

The repository includes `Dockerfile` and `docker-compose.yml` for running the MCP server and graph API with an optional Neo4j service.

For day-to-day development, the recommended path is:

- run only `neo4j` from Compose with `npm run neo4j:up`
- keep `scriptorium-mcp` running locally with `npm run dev`
- stop the database with `npm run neo4j:down`

## Repository layout

- `src/` application source
- `plugins/` optional ontology definitions
- `plans/` architecture and roadmap notes
- `projects/` local runtime workspace data (kept out of git by default)

## Notes

- `projects/` is intentionally gitignored so local book data and exports do not get published accidentally.
- The server works in file-backed mode even when Neo4j is unavailable.
