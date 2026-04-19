/**
 * 🏛️ Scriptorium Core Domain Model
 *
 * Canonical types for the entire Scriptorium system.
 * All services, tools, and the Knowledge Graph use these types.
 * Single source of truth — no duplication across modules.
 */

import type { LocalizedTextMap } from "../i18n/locales.js";

// ─── Provenance ───────────────────────────────────────────────────────────────

export type ProvenanceSource =
  | 'manual'           // User explicitly registered
  | 'auto_extracted'   // Extracted from chapter text
  | 'inferred'         // Inferred by Lore Guardian
  | `chapter_${number}` // From a specific chapter

export interface Provenance {
  source: ProvenanceSource;
  timestamp: string;       // ISO 8601
  actor: string;           // Tool or user that created this
  confidence: number;      // 0.0–1.0
  notes?: string;
}

// ─── Localization & Temporal/Causal Metadata ──────────────────────────────────

export type LocalizedText = LocalizedTextMap;

export type TemporalPrecision = 'exact' | 'approximate' | 'inferred' | 'unknown';
export type TimelineAxis = 'story_time' | 'narration_time' | 'publication_time';
export type CausalPolarity = 'enables' | 'blocks' | 'triggers' | 'explains';

export interface TemporalMetadata {
  start?: string;
  end?: string;
  duration?: string;
  temporalPrecision?: TemporalPrecision;
  timelineAxis?: TimelineAxis;
  chapterSpanStart?: number;
  chapterSpanEnd?: number;
}

export interface CausalMetadata {
  causeConfidence?: number;
  causalPolarity?: CausalPolarity;
  causalDistance?: number;
  evidenceSource?: string;
  forecastHorizonChapters?: number;
}

export interface EntityLocalization {
  name?: LocalizedText;
  observations?: LocalizedText[];
  aliases?: LocalizedText[];
  properties?: Record<string, LocalizedText>;
}

export interface RelationLocalization {
  label?: LocalizedText;
  properties?: Record<string, LocalizedText>;
}

export interface TimelineEventLocalization {
  event?: LocalizedText;
}

export interface LoreFactLocalization {
  key?: LocalizedText;
  value?: LocalizedText;
}

// ─── Entity ───────────────────────────────────────────────────────────────────

export interface EntityNode {
  id: string;                          // UUID v4
  name: string;                        // Primary identifier (unique per project)
  type: string;                        // From ontology plugin (e.g. Character, Location, MagicSystem)
  project: string;                     // Project slug
  observations: string[];              // Free-text facts about this entity
  aliases: string[];                   // Alternative names / spellings
  properties: Record<string, string>;  // Typed key-value pairs from ontology
  localized?: EntityLocalization;      // Structured fields for explorer/UI layers
  temporal?: TemporalMetadata;         // Optional temporal placement / validity window
  causal?: CausalMetadata;             // Optional causal metadata where entity acts as state/risk anchor
  confidence: number;                  // 0.0–1.0 overall confidence
  provenance: Provenance;
  version: number;                     // Incremented on each update
  created: string;                     // ISO 8601
  updated: string;                     // ISO 8601
  chapter?: number;                    // Chapter where first introduced
  tags?: string[];                     // Free-form tags for filtering
}

// ─── Relation ─────────────────────────────────────────────────────────────────

export interface RelationEdge {
  id: string;                          // UUID v4
  from: string;                        // Entity name (source)
  to: string;                          // Entity name (target)
  type: string;                        // UPPER_SNAKE_CASE (from ontology)
  project: string;
  properties: Record<string, string>;
  localized?: RelationLocalization;    // Localized labels and property translations
  temporal?: TemporalMetadata;         // Optional relation interval/chapter span metadata
  causal?: CausalMetadata;             // Optional causal reasoning metadata
  confidence: number;
  provenance: Provenance;
  chapter?: number;                    // Chapter where this relation was established
  created: string;
  updated: string;
}

// ─── Contradiction ────────────────────────────────────────────────────────────

export type ContradictionSeverity = 'info' | 'warning' | 'error';

export interface Contradiction {
  id: string;                          // UUID v4
  entity: string;                      // Primary entity involved
  relatedEntity?: string;              // Secondary entity (if applicable)
  issue: string;                       // Human-readable description
  severity: ContradictionSeverity;
  details?: string;                    // Additional context
  chapter?: number;                    // Chapter where contradiction occurs
  suggestedFix?: string;               // AI-suggested resolution
  resolved: boolean;
  detectedAt: string;                  // ISO 8601
}

// ─── Path ─────────────────────────────────────────────────────────────────────

export interface PathResult {
  path: string[];                      // Entity names along the path
  length: number;
  relations: string[];                 // Relation types along the path
  totalConfidence: number;             // Product of all edge confidences
}

// ─── Graph Summary ────────────────────────────────────────────────────────────

export interface GraphSummary {
  nodes: number;
  relations: number;
  project: string;
  topEntities: Array<{
    name: string;
    type: string;
    connections: number;
  }>;
  isConnected: boolean;
  contradictions?: number;
  lastUpdated?: string;
}

// ─── Timeline Event ───────────────────────────────────────────────────────────

export interface TimelineEvent {
  id?: string;
  chapter: number;
  entity: string;
  targetEntity?: string;
  relationType?: string;
  event: string;
  localized?: TimelineEventLocalization;
  temporal?: TemporalMetadata;
  causal?: CausalMetadata;
  confidence: number;
  provenance: ProvenanceSource;
}

// ─── Lore Fact (JSON fallback) ────────────────────────────────────────────────

export interface LoreFact {
  category: string;
  key: string;
  value: string;
  localized?: LoreFactLocalization;
  temporal?: TemporalMetadata;
  causal?: CausalMetadata;
  chapter?: number;
  added: string;
  confidence: number;
  source: ProvenanceSource;
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface ProjectMeta {
  name: string;
  genre: string;
  description: string;
  created: string;
  mode: 'solo_author' | 'co_author' | 'editor';
  living_bible_synced: boolean;
  version: string;
  ontology_plugins?: string[];         // Active plugin names
}

// ─── Ontology Plugin ──────────────────────────────────────────────────────────

export interface EntityTypeDef {
  name: string;
  description: string;
  properties?: string[];
  color?: string;
}

export interface RelationTypeDef {
  name: string;
  from: string;
  to: string;
  description?: string;
}

export interface ConsistencyRule {
  id: string;
  description: string;
  query?: string;                      // Cypher query for Neo4j
  severity: ContradictionSeverity;
}

export interface OntologyPlugin {
  name: string;
  version: string;
  description?: string;
  entityTypes: EntityTypeDef[];
  relationTypes: RelationTypeDef[];
  consistencyRules?: ConsistencyRule[];
  _filename?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function makeProvenance(source: ProvenanceSource, actor: string, confidence = 0.9, notes?: string): Provenance {
  return { source, timestamp: new Date().toISOString(), actor, confidence, notes };
}

export function isHighConfidence(entity: EntityNode | RelationEdge): boolean {
  return entity.confidence >= 0.8;
}
