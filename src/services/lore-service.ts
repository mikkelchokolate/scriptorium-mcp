import neo4j, { Driver } from 'neo4j-driver';
import { randomUUID } from 'crypto';
import { ScriptoriumError, logOperation } from '../utils/error-handler.js';
import type { ScriptoriumEventBus } from '../utils/event-bus.js';
import { localizedTextValues } from '../core/i18n/locales.js';
import type {
  EntityNode,
  RelationEdge,
  Contradiction,
  PathResult,
  GraphSummary,
  TimelineEvent,
  Provenance,
  ProvenanceSource,
  TemporalMetadata,
  CausalMetadata,
  EntityLocalization,
  RelationLocalization,
  TimelineEventLocalization,
} from '../core/domain/entities.js';
import { makeProvenance } from '../core/domain/entities.js';
import { embedText } from '../utils/text-embedding.js';

/**
 * 🏛️ LoreService v3.3 — Scriptorium Nexus Knowledge Graph
 *
 * Production-grade Neo4j integration using canonical domain model from core/domain/entities.ts.
 * - Dependency Injection: EventBus injected via configure(), no hidden singleton deps
 * - driver.executeQuery (Neo4j 5.x) — no manual session management
 * - Full domain model: id, provenance, confidence, version, aliases, properties
 * - Temporal + causal graph foundations for future explorer/timeline APIs
 * - Localized fields stored as derived graph metadata
 * - Semantic contradiction detection (alive/dead, timeline, orphans, alias conflicts)
 * - Path analysis, centrality, temporal queries
 * - autoExtractAndRegisterFacts() — auto-extract entities from chapter text
 * - Uniform ScriptoriumError handling + proper Neo4j Integer → number coercion
 * - Graceful JSON fallback when Neo4j unavailable
 */

const CAUSAL_RELATION_TYPES = ['CAUSES', 'ENABLES', 'PREVENTS', 'REVEALS', 'DEPENDS_ON', 'FORESHADOWS'] as const;

type TemporalQueryWindow = {
  chapterStart?: number;
  chapterEnd?: number;
  start?: string;
  end?: string;
};

type CausalQueryOptions = {
  entity?: string;
  maxDistance?: number;
  minConfidence?: number;
};

function serializeJson(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toNumber(value: any): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value?.toInt === 'function') return value.toInt();
  if (typeof value === 'number') return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function normalizeTemporalMetadata(temporal?: TemporalMetadata): TemporalMetadata | undefined {
  if (!temporal) return undefined;

  const normalized: TemporalMetadata = {
    start: temporal.start,
    end: temporal.end,
    duration: temporal.duration,
    temporalPrecision: temporal.temporalPrecision,
    timelineAxis: temporal.timelineAxis,
    chapterSpanStart: temporal.chapterSpanStart,
    chapterSpanEnd: temporal.chapterSpanEnd,
  };

  return Object.values(normalized).some(value => value !== undefined) ? normalized : undefined;
}

function normalizeCausalMetadata(causal?: CausalMetadata): CausalMetadata | undefined {
  if (!causal) return undefined;

  const normalized: CausalMetadata = {
    causeConfidence: causal.causeConfidence,
    causalPolarity: causal.causalPolarity,
    causalDistance: causal.causalDistance,
    evidenceSource: causal.evidenceSource,
    forecastHorizonChapters: causal.forecastHorizonChapters,
  };

  return Object.values(normalized).some(value => value !== undefined) ? normalized : undefined;
}

// ─── DI Container ─────────────────────────────────────────────────────────────

export interface LoreServiceDeps {
  eventBus?: ScriptoriumEventBus;
}

export class LoreService {
  private driver: Driver | null = null;
  private _connected = false;
  private deps: LoreServiceDeps;

  constructor(deps: LoreServiceDeps = {}) {
    this.deps = deps;
  }

  /** Update dependencies after construction */
  public configure(deps: LoreServiceDeps): this {
    this.deps = { ...this.deps, ...deps };
    return this;
  }

  // ─── Connection ─────────────────────────────────────────────────────────────

  public async connect(
    uri: string = process.env.NEO4J_URI ?? 'bolt://localhost:7687',
    username: string = process.env.NEO4J_USERNAME ?? 'neo4j',
    password: string = process.env.NEO4J_PASSWORD ?? 'password'
  ): Promise<void> {
    if (this._connected) return;

    try {
      this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 5000,
      });
      await this.driver.verifyConnectivity({ database: 'neo4j' });
      this._connected = true;
      logOperation('lore_service_connect', 'neo4j', { uri });
      await this.initializeSchema();
    } catch (error) {
      this.driver = null;
      this._connected = false;
      logOperation('lore_service_fallback', 'json_mode', { reason: String(error) });
    }
  }

  public get isConnected(): boolean {
    return this._connected && this.driver !== null;
  }

  private requireDriver(): Driver {
    if (!this.driver) throw new ScriptoriumError('Neo4j not connected — start Neo4j or use docker-compose up', 'NEO4J_UNAVAILABLE');
    return this.driver;
  }

  // ─── Schema ─────────────────────────────────────────────────────────────────

  private async initializeSchema(): Promise<void> {
    if (!this.driver) return;

    const statements = [
      `CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE`,
      `CREATE CONSTRAINT entity_name_project IF NOT EXISTS FOR (e:Entity) REQUIRE (e.name, e.project) IS UNIQUE`,
      `CREATE CONSTRAINT project_name IF NOT EXISTS FOR (p:Project) REQUIRE p.name IS UNIQUE`,
      `CREATE INDEX entity_type IF NOT EXISTS FOR (e:Entity) ON (e.type)`,
      `CREATE INDEX entity_project IF NOT EXISTS FOR (e:Entity) ON (e.project)`,
      `CREATE INDEX entity_chapter IF NOT EXISTS FOR (e:Entity) ON (e.chapter)`,
      `CREATE INDEX entity_temporal_start IF NOT EXISTS FOR (e:Entity) ON (e.start)`,
      `CREATE INDEX entity_temporal_end IF NOT EXISTS FOR (e:Entity) ON (e.end)`,
      `CREATE INDEX entity_chapter_span_start IF NOT EXISTS FOR (e:Entity) ON (e.chapterSpanStart)`,
      `CREATE INDEX entity_chapter_span_end IF NOT EXISTS FOR (e:Entity) ON (e.chapterSpanEnd)`,
      // Vector index (offline deterministic embeddings)
      `CREATE VECTOR INDEX entity_embedding IF NOT EXISTS FOR (e:Entity) ON (e.embedding) OPTIONS { indexConfig: { ` +
        `\"vector.dimensions\": 256, \"vector.similarity_function\": \"cosine\" } }`,
    ];

    for (const stmt of statements) {
      try {
        await this.driver.executeQuery(stmt, {}, { database: 'neo4j' });
      } catch {
        /* constraint or capability already exists */
      }
    }
    logOperation('lore_service_schema', 'initialized', {});
  }

  // ─── Entity CRUD ────────────────────────────────────────────────────────────

  public async upsertEntity(
    input: Omit<EntityNode, 'id' | 'created' | 'updated' | 'version' | 'provenance'> & {
      id?: string;
      provenance?: Provenance;
    }
  ): Promise<EntityNode> {
    const driver = this.requireDriver();
    const now = new Date().toISOString();
    const id = input.id ?? randomUUID();
    const provenance = input.provenance ?? makeProvenance('manual', 'lore_service');
    const temporal = normalizeTemporalMetadata(input.temporal);
    const causal = normalizeCausalMetadata(input.causal);

    const localizedNameParts = localizedTextValues(input.localized?.name);
    const localizedObservationParts = (input.localized?.observations ?? []).flatMap((item) => localizedTextValues(item));
    const toEmbed = [
      input.name,
      ...(input.aliases ?? []),
      ...(input.observations ?? []),
      ...localizedNameParts,
      ...localizedObservationParts,
    ].join('\n').trim();
    const embedding = embedText(toEmbed, { dimensions: 256 });

    const result = await driver.executeQuery(`
      MERGE (e:Entity {name: $name, project: $project})
      ON CREATE SET
        e.id = $id,
        e.type = $type,
        e.observations = $observations,
        e.aliases = $aliases,
        e.properties = $properties,
        e.localized = $localized,
        e.confidence = $confidence,
        e.provenance_source = $provenance_source,
        e.provenance_actor = $provenance_actor,
        e.embedding = $embedding,
        e.version = 1,
        e.chapter = $chapter,
        e.tags = $tags,
        e.start = $start,
        e.end = $end,
        e.duration = $duration,
        e.temporalPrecision = $temporalPrecision,
        e.timelineAxis = $timelineAxis,
        e.chapterSpanStart = $chapterSpanStart,
        e.chapterSpanEnd = $chapterSpanEnd,
        e.causeConfidence = $causeConfidence,
        e.causalPolarity = $causalPolarity,
        e.causalDistance = $causalDistance,
        e.evidenceSource = $evidenceSource,
        e.forecastHorizonChapters = $forecastHorizonChapters,
        e.created = $now,
        e.updated = $now
      ON MATCH SET
        e.type = $type,
        e.observations = $observations,
        e.aliases = $aliases,
        e.properties = $properties,
        e.localized = $localized,
        e.confidence = $confidence,
        e.provenance_source = $provenance_source,
        e.provenance_actor = $provenance_actor,
        e.embedding = $embedding,
        e.version = e.version + 1,
        e.chapter = coalesce($chapter, e.chapter),
        e.tags = $tags,
        e.start = $start,
        e.end = $end,
        e.duration = $duration,
        e.temporalPrecision = $temporalPrecision,
        e.timelineAxis = $timelineAxis,
        e.chapterSpanStart = $chapterSpanStart,
        e.chapterSpanEnd = $chapterSpanEnd,
        e.causeConfidence = $causeConfidence,
        e.causalPolarity = $causalPolarity,
        e.causalDistance = $causalDistance,
        e.evidenceSource = $evidenceSource,
        e.forecastHorizonChapters = $forecastHorizonChapters,
        e.updated = $now
      WITH e
      MERGE (p:Project {name: $project})
      MERGE (e)-[:BELONGS_TO]->(p)
      RETURN e
    `, {
      id,
      name: input.name,
      type: input.type,
      project: input.project,
      observations: input.observations ?? [],
      aliases: input.aliases ?? [],
      properties: input.properties ?? {},
      localized: serializeJson(input.localized),
      confidence: input.confidence ?? 0.9,
      provenance_source: provenance.source,
      provenance_actor: provenance.actor,
      embedding,
      chapter: input.chapter ?? null,
      tags: input.tags ?? [],
      start: temporal?.start ?? null,
      end: temporal?.end ?? null,
      duration: temporal?.duration ?? null,
      temporalPrecision: temporal?.temporalPrecision ?? null,
      timelineAxis: temporal?.timelineAxis ?? null,
      chapterSpanStart: temporal?.chapterSpanStart ?? null,
      chapterSpanEnd: temporal?.chapterSpanEnd ?? null,
      causeConfidence: causal?.causeConfidence ?? null,
      causalPolarity: causal?.causalPolarity ?? null,
      causalDistance: causal?.causalDistance ?? null,
      evidenceSource: causal?.evidenceSource ?? null,
      forecastHorizonChapters: causal?.forecastHorizonChapters ?? null,
      now,
    }, { database: 'neo4j' });

    this.deps.eventBus?.emitEvent('fact.registered', {
      project: input.project,
      actor: 'lore_service',
      details: { entity: input.name, type: input.type },
    });

    const props = result.records[0].get('e').properties;
    return this.mapToEntityNode(props);
  }

  public async getEntity(name: string, project: string): Promise<EntityNode | null> {
    if (!this.driver) return null;

    const result = await this.driver.executeQuery(
      `MATCH (e:Entity {name: $name, project: $project}) RETURN e`,
      { name, project },
      { database: 'neo4j' }
    );

    if (result.records.length === 0) return null;
    return this.mapToEntityNode(result.records[0].get('e').properties);
  }

  public async addObservation(name: string, project: string, observation: string, source: ProvenanceSource = 'manual'): Promise<void> {
    const driver = this.requireDriver();

    await driver.executeQuery(`
      MATCH (e:Entity {name: $name, project: $project})
      SET e.observations = e.observations + [$observation],
          e.provenance_source = $source,
          e.version = e.version + 1,
          e.updated = datetime()
    `, { name, project, observation, source }, { database: 'neo4j' });
  }

  public async getEntitiesActiveDuring(project: string, window: TemporalQueryWindow = {}): Promise<EntityNode[]> {
    if (!this.driver) return [];

    const result = await this.driver.executeQuery(`
      MATCH (e:Entity {project: $project})
      WHERE (
        ($chapterStart IS NULL AND $chapterEnd IS NULL)
        OR (
          coalesce(e.chapterSpanStart, e.chapter) <= coalesce($chapterEnd, coalesce(e.chapterSpanEnd, e.chapter, 999999))
          AND coalesce(e.chapterSpanEnd, e.chapter) >= coalesce($chapterStart, coalesce(e.chapterSpanStart, e.chapter, -999999))
        )
      )
      AND (
        ($start IS NULL AND $end IS NULL)
        OR (
          coalesce(e.start, '') <= coalesce($end, '9999-12-31T23:59:59.999Z')
          AND coalesce(e.end, e.start, '9999-12-31T23:59:59.999Z') >= coalesce($start, '')
        )
      )
      RETURN e
      ORDER BY coalesce(e.chapterSpanStart, e.chapter, 0) ASC, e.name ASC
    `, {
      project,
      chapterStart: window.chapterStart ?? null,
      chapterEnd: window.chapterEnd ?? null,
      start: window.start ?? null,
      end: window.end ?? null,
    }, { database: 'neo4j' });

    return result.records.map(record => this.mapToEntityNode(record.get('e').properties));
  }

  // ─── Relations ──────────────────────────────────────────────────────────────

  public async upsertRelation(edge: Omit<RelationEdge, 'id' | 'created' | 'updated'> & { id?: string }): Promise<void> {
    const driver = this.requireDriver();
    const now = new Date().toISOString();
    const safeType = edge.type.replace(/[^A-Z_]/g, '_');
    const temporal = normalizeTemporalMetadata(edge.temporal);
    const causal = normalizeCausalMetadata(edge.causal);

    await driver.executeQuery(`
      MATCH (a:Entity {name: $from, project: $project}), (b:Entity {name: $to, project: $project})
      MERGE (a)-[r:${safeType}]->(b)
      ON CREATE SET
        r.id = $id,
        r.project = $project,
        r.properties = $properties,
        r.localized = $localized,
        r.confidence = $confidence,
        r.provenance_source = $provenance_source,
        r.provenance_actor = $provenance_actor,
        r.chapter = $chapter,
        r.start = $start,
        r.end = $end,
        r.duration = $duration,
        r.temporalPrecision = $temporalPrecision,
        r.timelineAxis = $timelineAxis,
        r.chapterSpanStart = $chapterSpanStart,
        r.chapterSpanEnd = $chapterSpanEnd,
        r.causeConfidence = $causeConfidence,
        r.causalPolarity = $causalPolarity,
        r.causalDistance = $causalDistance,
        r.evidenceSource = $evidenceSource,
        r.forecastHorizonChapters = $forecastHorizonChapters,
        r.created = $now,
        r.updated = $now
      ON MATCH SET
        r.project = $project,
        r.properties = $properties,
        r.localized = $localized,
        r.confidence = $confidence,
        r.provenance_source = $provenance_source,
        r.provenance_actor = $provenance_actor,
        r.chapter = $chapter,
        r.start = $start,
        r.end = $end,
        r.duration = $duration,
        r.temporalPrecision = $temporalPrecision,
        r.timelineAxis = $timelineAxis,
        r.chapterSpanStart = $chapterSpanStart,
        r.chapterSpanEnd = $chapterSpanEnd,
        r.causeConfidence = $causeConfidence,
        r.causalPolarity = $causalPolarity,
        r.causalDistance = $causalDistance,
        r.evidenceSource = $evidenceSource,
        r.forecastHorizonChapters = $forecastHorizonChapters,
        r.updated = $now
    `, {
      id: edge.id ?? randomUUID(),
      from: edge.from,
      to: edge.to,
      project: edge.project,
      properties: edge.properties ?? {},
      localized: serializeJson(edge.localized),
      confidence: edge.confidence ?? 0.9,
      provenance_source: edge.provenance?.source ?? 'manual',
      provenance_actor: edge.provenance?.actor ?? 'lore_service',
      chapter: edge.chapter ?? null,
      start: temporal?.start ?? null,
      end: temporal?.end ?? null,
      duration: temporal?.duration ?? null,
      temporalPrecision: temporal?.temporalPrecision ?? null,
      timelineAxis: temporal?.timelineAxis ?? null,
      chapterSpanStart: temporal?.chapterSpanStart ?? null,
      chapterSpanEnd: temporal?.chapterSpanEnd ?? null,
      causeConfidence: causal?.causeConfidence ?? null,
      causalPolarity: causal?.causalPolarity ?? null,
      causalDistance: causal?.causalDistance ?? null,
      evidenceSource: causal?.evidenceSource ?? null,
      forecastHorizonChapters: causal?.forecastHorizonChapters ?? null,
      now,
    }, { database: 'neo4j' });
  }

  public async getRelationsByChapterWindow(project: string, chapterStart?: number, chapterEnd?: number): Promise<RelationEdge[]> {
    if (!this.driver) return [];

    const result = await this.driver.executeQuery(`
      MATCH (a:Entity {project: $project})-[r]->(b:Entity {project: $project})
      WHERE (
        ($chapterStart IS NULL AND $chapterEnd IS NULL)
        OR (
          coalesce(r.chapterSpanStart, r.chapter) <= coalesce($chapterEnd, coalesce(r.chapterSpanEnd, r.chapter, 999999))
          AND coalesce(r.chapterSpanEnd, r.chapter) >= coalesce($chapterStart, coalesce(r.chapterSpanStart, r.chapter, -999999))
        )
      )
      RETURN a.name as from, b.name as to, type(r) as type, r
      ORDER BY coalesce(r.chapterSpanStart, r.chapter, 0) ASC, from ASC, to ASC
    `, {
      project,
      chapterStart: chapterStart ?? null,
      chapterEnd: chapterEnd ?? null,
    }, { database: 'neo4j' });

    return result.records.map(record => this.mapToRelationEdge(
      record.get('r').properties,
      record.get('type') as string,
      record.get('from') as string,
      record.get('to') as string,
    ));
  }

  public async getCausalRelations(project: string, options: CausalQueryOptions = {}): Promise<RelationEdge[]> {
    if (!this.driver) return [];

    const result = await this.driver.executeQuery(`
      MATCH (a:Entity {project: $project})-[r]->(b:Entity {project: $project})
      WHERE (
        type(r) IN $causalRelationTypes
        OR r.causalPolarity IS NOT NULL
        OR r.causeConfidence IS NOT NULL
      )
      AND ($entity IS NULL OR a.name = $entity OR b.name = $entity)
      AND coalesce(r.causalDistance, 0) <= $maxDistance
      AND coalesce(r.causeConfidence, r.confidence, 0.0) >= $minConfidence
      RETURN a.name as from, b.name as to, type(r) as type, r
      ORDER BY coalesce(r.causeConfidence, r.confidence, 0.0) DESC, from ASC, to ASC
    `, {
      project,
      entity: options.entity ?? null,
      maxDistance: options.maxDistance ?? 10,
      minConfidence: options.minConfidence ?? 0,
      causalRelationTypes: [...CAUSAL_RELATION_TYPES],
    }, { database: 'neo4j' });

    return result.records.map(record => this.mapToRelationEdge(
      record.get('r').properties,
      record.get('type') as string,
      record.get('from') as string,
      record.get('to') as string,
    ));
  }

  // ─── Contradiction Detection ─────────────────────────────────────────────────

  public async findContradictions(project: string): Promise<Contradiction[]> {
    if (!this.driver) return [];

    const results: Contradiction[] = [];
    const now = new Date().toISOString();

    // 1. Life status contradictions
    const statusResult = await this.driver.executeQuery(`
      MATCH (e:Entity {project: $project})
      WHERE any(o IN e.observations WHERE o =~ '(?i).*(dead|deceased|killed|slain).*')
        AND any(o IN e.observations WHERE o =~ '(?i).*(alive|survived|living|active).*')
      RETURN e.name as entity, e.observations as observations
    `, { project }, { database: 'neo4j' });

    for (const r of statusResult.records) {
      results.push({
        id: randomUUID(), entity: r.get('entity'),
        issue: 'Contradictory life status (alive/dead)',
        severity: 'error',
        details: `Observations: ${(r.get('observations') as string[]).join('; ')}`,
        resolved: false, detectedAt: now,
        suggestedFix: 'Review observations and remove the incorrect one, or add a chapter reference to clarify the timeline.',
      });
    }

    // 2. Timeline violations
    const timelineResult = await this.driver.executeQuery(`
      MATCH (a:Entity {project: $project})-[r]->(b:Entity {project: $project})
      WHERE r.chapter IS NOT NULL AND a.chapter IS NOT NULL AND r.chapter < a.chapter
      RETURN a.name as entity, b.name as related, type(r) as rel, r.chapter as rel_chapter, a.chapter as entity_chapter
    `, { project }, { database: 'neo4j' });

    for (const r of timelineResult.records) {
      results.push({
        id: randomUUID(), entity: r.get('entity'), relatedEntity: r.get('related'),
        issue: `Timeline violation: "${r.get('rel')}" relation in Ch.${r.get('rel_chapter')} but entity introduced in Ch.${r.get('entity_chapter')}`,
        severity: 'warning', resolved: false, detectedAt: now,
        chapter: toNumber(r.get('rel_chapter')),
      });
    }

    // 3. Orphaned entities
    const orphanResult = await this.driver.executeQuery(`
      MATCH (e:Entity {project: $project})
      WHERE NOT (e)-[]-() AND e.type <> 'Project'
      RETURN e.name as entity, e.type as type
    `, { project }, { database: 'neo4j' });

    for (const r of orphanResult.records) {
      results.push({
        id: randomUUID(), entity: r.get('entity'),
        issue: `Orphaned ${r.get('type')} — no relations to other entities`,
        severity: 'info', resolved: false, detectedAt: now,
        suggestedFix: 'Connect this entity to others using lore_guardian or world_weaver.',
      });
    }

    // 4. Duplicate aliases
    const aliasResult = await this.driver.executeQuery(`
      MATCH (a:Entity {project: $project}), (b:Entity {project: $project})
      WHERE a.name < b.name
        AND any(alias IN a.aliases WHERE alias IN b.aliases)
      RETURN a.name as entity1, b.name as entity2,
             [alias IN a.aliases WHERE alias IN b.aliases][0] as shared_alias
    `, { project }, { database: 'neo4j' });

    for (const r of aliasResult.records) {
      results.push({
        id: randomUUID(), entity: r.get('entity1'), relatedEntity: r.get('entity2'),
        issue: `Shared alias "${r.get('shared_alias')}" — may cause reader confusion`,
        severity: 'warning', resolved: false, detectedAt: now,
      });
    }

    return results;
  }

  // ─── Vector Similarity Search (offline deterministic embeddings) ─────────────

  public async semanticSearch(project: string, query: string, limit = 10): Promise<Array<{ name: string; type: string; score: number }>> {
    if (!this.driver) return [];

    const embedding = embedText(query, { dimensions: 256 });

    const result = await this.driver.executeQuery(`
      CALL db.index.vector.queryNodes('entity_embedding', $limit, $embedding)
      YIELD node, score
      WHERE node.project = $project
      RETURN node.name as name, node.type as type, score
      ORDER BY score DESC
    `, { project, limit, embedding }, { database: 'neo4j' });

    return result.records.map(rec => ({
      name: rec.get('name') as string,
      type: rec.get('type') as string,
      score: rec.get('score') as number,
    }));
  }

  // ─── Path Analysis ───────────────────────────────────────────────────────────

  public async findPath(from: string, to: string, project: string, maxDepth = 6): Promise<PathResult | null> {
    if (!this.driver) return null;

    const result = await this.driver.executeQuery(`
      MATCH path = shortestPath(
        (a:Entity {name: $from, project: $project})-[*1..${maxDepth}]-(b:Entity {name: $to, project: $project})
      )
      RETURN [n IN nodes(path) | n.name] as nodes,
             [r IN relationships(path) | type(r)] as relations,
             length(path) as pathLength,
             reduce(conf = 1.0, r IN relationships(path) | conf * coalesce(r.confidence, 1.0)) as totalConfidence
    `, { from, to, project }, { database: 'neo4j' });

    if (result.records.length === 0) return null;
    const r = result.records[0];
    return {
      path: r.get('nodes') as string[],
      length: toNumber(r.get('pathLength')) ?? 0,
      relations: r.get('relations') as string[],
      totalConfidence: r.get('totalConfidence') as number,
    };
  }

  // ─── Centrality ──────────────────────────────────────────────────────────────

  public async getCentralEntities(project: string, limit = 10): Promise<Array<{ name: string; type: string; degree: number }>> {
    if (!this.driver) return [];

    const result = await this.driver.executeQuery(`
      MATCH (e:Entity {project: $project})
      OPTIONAL MATCH (e)-[r]-()
      RETURN e.name as name, e.type as type, count(r) as degree
      ORDER BY degree DESC
      LIMIT $limit
    `, { project, limit }, { database: 'neo4j' });

    return result.records.map(r => ({
      name: r.get('name') as string,
      type: r.get('type') as string,
      degree: toNumber(r.get('degree')) ?? 0,
    }));
  }

  // ─── Temporal Queries ────────────────────────────────────────────────────────

  public async getTimelineEvents(project: string): Promise<TimelineEvent[]> {
    if (!this.driver) return [];

    const result = await this.driver.executeQuery(`
      MATCH (a:Entity {project: $project})-[r]->(b:Entity {project: $project})
      WHERE r.chapter IS NOT NULL
         OR r.chapterSpanStart IS NOT NULL
         OR r.chapterSpanEnd IS NOT NULL
         OR r.start IS NOT NULL
         OR r.end IS NOT NULL
         OR r.causeConfidence IS NOT NULL
         OR r.causalPolarity IS NOT NULL
      RETURN r.id as id,
             coalesce(r.chapter, r.chapterSpanStart, r.chapterSpanEnd, 0) as chapter,
             a.name as entity,
             b.name as targetEntity,
             type(r) as relationType,
             type(r) + ' → ' + b.name as event,
             r.localized as localized,
             r.start as start,
             r.end as end,
             r.duration as duration,
             r.temporalPrecision as temporalPrecision,
             r.timelineAxis as timelineAxis,
             r.chapterSpanStart as chapterSpanStart,
             r.chapterSpanEnd as chapterSpanEnd,
             r.causeConfidence as causeConfidence,
             r.causalPolarity as causalPolarity,
             r.causalDistance as causalDistance,
             r.evidenceSource as evidenceSource,
             r.forecastHorizonChapters as forecastHorizonChapters,
             coalesce(r.confidence, 0.9) as confidence,
             coalesce(r.provenance_source, 'manual') as provenance
      ORDER BY chapter ASC, entity ASC
    `, { project }, { database: 'neo4j' });

    return result.records.map(record => {
      const localized = parseJson<RelationLocalization>(record.get('localized'), {});
      return {
        id: record.get('id') as string | undefined,
        chapter: toNumber(record.get('chapter')) ?? 0,
        entity: record.get('entity') as string,
        targetEntity: record.get('targetEntity') as string,
        relationType: record.get('relationType') as string,
        event: record.get('event') as string,
        localized: this.mapTimelineEventLocalization(localized),
        temporal: normalizeTemporalMetadata({
          start: record.get('start') as string | undefined,
          end: record.get('end') as string | undefined,
          duration: record.get('duration') as string | undefined,
          temporalPrecision: record.get('temporalPrecision') as TemporalMetadata['temporalPrecision'],
          timelineAxis: record.get('timelineAxis') as TemporalMetadata['timelineAxis'],
          chapterSpanStart: toNumber(record.get('chapterSpanStart')),
          chapterSpanEnd: toNumber(record.get('chapterSpanEnd')),
        }),
        causal: normalizeCausalMetadata({
          causeConfidence: record.get('causeConfidence') as number | undefined,
          causalPolarity: record.get('causalPolarity') as CausalMetadata['causalPolarity'],
          causalDistance: toNumber(record.get('causalDistance')),
          evidenceSource: record.get('evidenceSource') as string | undefined,
          forecastHorizonChapters: toNumber(record.get('forecastHorizonChapters')),
        }),
        confidence: record.get('confidence') as number,
        provenance: record.get('provenance') as ProvenanceSource,
      };
    });
  }

  // ─── Graph Summary ───────────────────────────────────────────────────────────

  public async getGraphSummary(project: string): Promise<GraphSummary> {
    if (!this.driver) return { nodes: 0, relations: 0, project, topEntities: [], isConnected: false };

    const [nodesResult, relsResult, topResult] = await Promise.all([
      this.driver.executeQuery(
        `MATCH (n:Entity {project: $project}) RETURN count(n) as count`,
        { project }, { database: 'neo4j' }
      ),
      this.driver.executeQuery(
        `MATCH (a:Entity {project: $project})-[r]->(b:Entity {project: $project}) RETURN count(r) as count`,
        { project }, { database: 'neo4j' }
      ),
      this.driver.executeQuery(`
        MATCH (e:Entity {project: $project})
        OPTIONAL MATCH (e)-[r]-()
        RETURN e.name as name, e.type as type, count(r) as connections
        ORDER BY connections DESC LIMIT 5
      `, { project }, { database: 'neo4j' }),
    ]);

    return {
      nodes: toNumber(nodesResult.records[0]?.get('count')) ?? 0,
      relations: toNumber(relsResult.records[0]?.get('count')) ?? 0,
      project,
      topEntities: topResult.records.map(r => ({
        name: r.get('name') as string,
        type: r.get('type') as string,
        connections: toNumber(r.get('connections')) ?? 0,
      })),
      isConnected: true,
      lastUpdated: new Date().toISOString(),
    };
  }

  // ─── Auto-Extraction ─────────────────────────────────────────────────────────

  /**
   * Auto-extract entities from chapter text and register them in the Knowledge Graph.
   * Uses regex-based NER (proper nouns, location patterns) as a lightweight alternative
   * to full embedding-based extraction. Registers new entities with provenance='auto_extracted'.
   */
  public async autoExtractAndRegisterFacts(
    text: string,
    project: string,
    chapter: number,
    pluginEntityTypes: string[] = []
  ): Promise<{ extracted: number; registered: number; skipped: number }> {
    const nameRegex = /\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*\b/g;
    const locationSuffixes = ['Kingdom', 'Empire', 'City', 'Forest', 'Mountain', 'River', 'Castle', 'Tower', 'Keep', 'Village', 'Town', 'Sea', 'Ocean', 'Desert', 'Plains'];
    const locationPattern = new RegExp(`\\b([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*\\s+(?:${locationSuffixes.join('|')}))\\b`, 'g');

    const rawNames = [...new Set(text.match(nameRegex) ?? [])];
    const locationMatches = [...new Set(text.match(locationPattern) ?? [])];

    // Filter out common English words that match proper noun pattern
    const stopWords = new Set(['The', 'This', 'That', 'Then', 'When', 'Where', 'What', 'Which', 'Who', 'How', 'But', 'And', 'For', 'Not', 'With', 'From', 'Into', 'Through', 'During', 'Before', 'After', 'Above', 'Below', 'Between', 'Chapter', 'Part', 'Book']);
    const candidates = rawNames.filter(n => !stopWords.has(n) && n.length > 3);

    let registered = 0;
    let skipped = 0;
    void pluginEntityTypes;

    for (const name of candidates) {
      const isLocation = locationMatches.some(l => l.includes(name));
      const type = isLocation ? 'Location' : 'Character';
      const mentions = (text.match(new RegExp(`\\b${name}\\b`, 'gi')) ?? []).length;

      // Only register if mentioned 2+ times (reduces noise)
      if (mentions < 2) { skipped++; continue; }

      try {
        if (this.driver) {
          await this.upsertEntity({
            name,
            type,
            project,
            observations: [`First mentioned in Chapter ${chapter}`],
            aliases: [],
            properties: {},
            confidence: Math.min(0.5 + mentions * 0.05, 0.85),
            provenance: makeProvenance(`chapter_${chapter}`, 'auto_extract', Math.min(0.5 + mentions * 0.05, 0.85)),
            chapter,
            temporal: { chapterSpanStart: chapter, chapterSpanEnd: chapter, timelineAxis: 'story_time', temporalPrecision: 'exact' },
          });
        }
        registered++;
      } catch {
        skipped++;
      }
    }

    logOperation('auto_extract', `ch${chapter}`, { project, extracted: candidates.length, registered, skipped });
    return { extracted: candidates.length, registered, skipped };
  }

  // ─── Legacy compat ───────────────────────────────────────────────────────────

  /** @deprecated Use upsertEntity() for full domain model support */
  public async createEntity(project: string, name: string, type: string, observations: string[] = []): Promise<void> {
    if (!this.driver) return; // silent fallback for legacy callers
    await this.upsertEntity({ name, type, project, observations, aliases: [], properties: {}, confidence: 0.9 });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private mapToEntityNode(props: Record<string, any>): EntityNode {
    const localized = parseJson<EntityLocalization>(props.localized, {});
    return {
      id: props.id,
      name: props.name,
      type: props.type,
      project: props.project,
      observations: props.observations ?? [],
      aliases: props.aliases ?? [],
      properties: props.properties ?? {},
      localized: Object.keys(localized).length > 0 ? localized : undefined,
      temporal: normalizeTemporalMetadata({
        start: props.start,
        end: props.end,
        duration: props.duration,
        temporalPrecision: props.temporalPrecision,
        timelineAxis: props.timelineAxis,
        chapterSpanStart: toNumber(props.chapterSpanStart),
        chapterSpanEnd: toNumber(props.chapterSpanEnd),
      }),
      causal: normalizeCausalMetadata({
        causeConfidence: props.causeConfidence,
        causalPolarity: props.causalPolarity,
        causalDistance: toNumber(props.causalDistance),
        evidenceSource: props.evidenceSource,
        forecastHorizonChapters: toNumber(props.forecastHorizonChapters),
      }),
      confidence: props.confidence ?? 0.9,
      provenance: makeProvenance(props.provenance_source ?? 'manual', props.provenance_actor ?? 'system'),
      version: toNumber(props.version) ?? 1,
      created: props.created,
      updated: props.updated,
      chapter: toNumber(props.chapter),
      tags: props.tags ?? [],
    };
  }

  private mapToRelationEdge(props: Record<string, any>, type: string, from: string, to: string): RelationEdge {
    const localized = parseJson<RelationLocalization>(props.localized, {});
    return {
      id: props.id,
      from,
      to,
      type,
      project: props.project,
      properties: props.properties ?? {},
      localized: Object.keys(localized).length > 0 ? localized : undefined,
      temporal: normalizeTemporalMetadata({
        start: props.start,
        end: props.end,
        duration: props.duration,
        temporalPrecision: props.temporalPrecision,
        timelineAxis: props.timelineAxis,
        chapterSpanStart: toNumber(props.chapterSpanStart),
        chapterSpanEnd: toNumber(props.chapterSpanEnd),
      }),
      causal: normalizeCausalMetadata({
        causeConfidence: props.causeConfidence,
        causalPolarity: props.causalPolarity,
        causalDistance: toNumber(props.causalDistance),
        evidenceSource: props.evidenceSource,
        forecastHorizonChapters: toNumber(props.forecastHorizonChapters),
      }),
      confidence: props.confidence ?? 0.9,
      provenance: makeProvenance(props.provenance_source ?? 'manual', props.provenance_actor ?? 'system'),
      chapter: toNumber(props.chapter),
      created: props.created,
      updated: props.updated,
    };
  }

  private mapTimelineEventLocalization(localized: RelationLocalization): TimelineEventLocalization | undefined {
    if (!localized.label) return undefined;
    return { event: localized.label };
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  public async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      this._connected = false;
    }
  }
}

/** Factory function — preferred over singleton for testability and DI */
export function createLoreService(deps: LoreServiceDeps = {}): LoreService {
  return new LoreService(deps);
}

/** Default singleton instance for backward compatibility with existing tools */
export const loreService = new LoreService();
export default loreService;
