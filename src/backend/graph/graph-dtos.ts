import type { LocaleCode, LocalizedTextMap } from "../../core/i18n/locales.js";

export type GraphLocale = LocaleCode;

export type GraphSourceKind = "canonical" | "neo4j" | "derived" | "empty";

export type GraphNodeKind =
  | "project"
  | "world_bible"
  | "outline"
  | "chapter"
  | "character"
  | "lore_fact"
  | "entity"
  | "event"
  | "constraint"
  | "unknown";

export type GraphLocalizedText = LocalizedTextMap;

export interface GraphResolvedText {
  locale: GraphLocale;
  value: string;
  fallbackLocale: GraphLocale;
  translations: Record<string, string>;
}

export interface GraphTemporalDTO {
  start?: string;
  end?: string;
  duration?: string;
  chapterSpanStart?: number;
  chapterSpanEnd?: number;
  timelineAxis?: string;
  precision?: string;
}

export interface GraphCausalDTO {
  causeConfidence?: number;
  causalPolarity?: string;
  causalDistance?: number;
  evidenceSource?: string;
  forecastHorizonChapters?: number;
}

export interface GraphNodeDataDTO {
  label: GraphResolvedText;
  subtitle?: GraphResolvedText;
  description?: GraphResolvedText;
  kind: GraphNodeKind;
  project: string;
  source: GraphSourceKind;
  confidence?: number;
  aliases?: string[];
  tags?: string[];
  temporal?: GraphTemporalDTO;
  causal?: GraphCausalDTO;
  createdAt?: string;
  updatedAt?: string;
  chapter?: number;
  details?: Record<string, unknown>;
}

export interface GraphFlowNodeDTO {
  id: string;
  type: GraphNodeKind | string;
  position: { x: number; y: number };
  data: GraphNodeDataDTO;
}

export interface GraphEdgeDataDTO {
  label: GraphResolvedText;
  relationType: string;
  project: string;
  source: GraphSourceKind;
  confidence?: number;
  temporal?: GraphTemporalDTO;
  causal?: GraphCausalDTO;
  createdAt?: string;
  updatedAt?: string;
  details?: Record<string, unknown>;
}

export interface GraphFlowEdgeDTO {
  id: string;
  source: string;
  target: string;
  type: string;
  data: GraphEdgeDataDTO;
}

export interface GraphProjectionSummaryDTO {
  project: string;
  nodes: number;
  edges: number;
  characters: number;
  chapters: number;
  loreFacts: number;
  entities: number;
  isConnectedToNeo4j: boolean;
  lastUpdated: string;
}

export interface GraphProjectionSnapshotDTO {
  project: string;
  locale: GraphLocale;
  source: GraphSourceKind;
  generatedAt: string;
  summary: GraphProjectionSummaryDTO;
  nodes: GraphFlowNodeDTO[];
  edges: GraphFlowEdgeDTO[];
  warnings: string[];
}

export interface GraphProjectionOptions {
  locale?: GraphLocale;
  includeNeo4j?: boolean;
}

export interface GraphTimelineEntryDTO {
  id: string;
  project: string;
  source: GraphSourceKind;
  label: GraphResolvedText;
  subtitle?: GraphResolvedText;
  description?: GraphResolvedText;
  chapter: number;
  confidence: number;
  temporal?: GraphTemporalDTO;
  causal?: GraphCausalDTO;
  entity?: string;
  targetEntity?: string;
  relationType?: string;
  nodeIds?: string[];
  edgeIds?: string[];
}

export interface GraphTimelineResponseDTO {
  project: string;
  locale: GraphLocale;
  generatedAt: string;
  entries: GraphTimelineEntryDTO[];
}

export type GraphForecastSeverity = "info" | "warning" | "critical";

export interface GraphForecastEvidenceDTO {
  kind: "fact" | "entity" | "relation" | "contradiction" | "timeline" | "outline";
  label: GraphResolvedText;
  chapter?: number;
  nodeIds?: string[];
  edgeIds?: string[];
}

export interface GraphForecastChainStepDTO {
  from: string;
  relation: string;
  to: string;
  confidence?: number;
  edgeId?: string;
}

export interface GraphForecastRiskDTO {
  id: string;
  type: "timeline_gap" | "causal_gap" | "contradiction" | "orphaned_arc" | "foreshadowing_gap";
  severity: GraphForecastSeverity;
  confidence: number;
  title: GraphResolvedText;
  summary: GraphResolvedText;
  impactedChapters: number[];
  evidence: GraphForecastEvidenceDTO[];
  causalChain?: GraphForecastChainStepDTO[];
  nodeIds?: string[];
  edgeIds?: string[];
}

export interface GraphForecastResponseDTO {
  project: string;
  locale: GraphLocale;
  generatedAt: string;
  horizon: number;
  currentChapter: number;
  risks: GraphForecastRiskDTO[];
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
}

export interface GraphCapabilitiesDTO {
  locales: GraphLocale[];
  defaultLocale: GraphLocale;
  neo4jConnected: boolean;
  forecastingAvailable: boolean;
  liveUpdatesAvailable: boolean;
  websocketPath: string;
  snapshotPathTemplate: string;
  forecastPathTemplate: string;
  timelinePathTemplate: string;
  projectsPath: string;
  maxForecastHorizon: number;
}

export interface GraphProjectSummaryDTO {
  slug: string;
  title: string;
  chapterCount: number;
  characterCount: number;
  updatedAt?: string;
}

export interface GraphBroadcastSnapshotMessage {
  kind: "snapshot";
  project: string;
  locale: GraphLocale;
  timestamp: string;
  version: number;
  eventId?: string;
  snapshot: GraphProjectionSnapshotDTO;
}

export interface GraphBroadcastUpdateMessage<TPayload = unknown> {
  kind: "update";
  project: string;
  locale: GraphLocale;
  timestamp: string;
  version: number;
  eventId?: string;
  event: string;
  payload: TPayload;
}

export type GraphBroadcastMessage<TPayload = unknown> =
  | GraphBroadcastSnapshotMessage
  | GraphBroadcastUpdateMessage<TPayload>;

export type GraphBroadcastListener = (message: GraphBroadcastMessage) => void;

export interface GraphSocketHelloDTO {
  connectionId: string;
  project: string;
  locale: GraphLocale;
  timestamp: string;
  capabilities: GraphCapabilitiesDTO;
}
