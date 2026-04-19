export type GraphLocale = string;
export type GraphSourceKind = "canonical" | "neo4j" | "derived" | "empty";

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
  [key: string]: unknown;
  label: GraphResolvedText;
  subtitle?: GraphResolvedText;
  description?: GraphResolvedText;
  kind: string;
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
  type: string;
  position: { x: number; y: number };
  data: GraphNodeDataDTO;
}

export interface GraphEdgeDataDTO {
  [key: string]: unknown;
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

export interface GraphProjectionSnapshotDTO {
  project: string;
  locale: GraphLocale;
  source: GraphSourceKind;
  generatedAt: string;
  summary: {
    project: string;
    nodes: number;
    edges: number;
    characters: number;
    chapters: number;
    loreFacts: number;
    entities: number;
    isConnectedToNeo4j: boolean;
    lastUpdated: string;
  };
  nodes: GraphFlowNodeDTO[];
  edges: GraphFlowEdgeDTO[];
  warnings: string[];
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

export interface GraphForecastRiskDTO {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  confidence: number;
  title: GraphResolvedText;
  summary: GraphResolvedText;
  impactedChapters: number[];
  evidence: Array<{
    kind: string;
    label: GraphResolvedText;
    chapter?: number;
    nodeIds?: string[];
    edgeIds?: string[];
  }>;
  causalChain?: Array<{
    from: string;
    relation: string;
    to: string;
    confidence?: number;
    edgeId?: string;
  }>;
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

export type GraphBroadcastMessage =
  | {
    kind: "snapshot";
    project: string;
    locale: GraphLocale;
    timestamp: string;
    version: number;
    eventId?: string;
    snapshot: GraphProjectionSnapshotDTO;
  }
  | {
    kind: "update";
    project: string;
    locale: GraphLocale;
    timestamp: string;
    version: number;
    eventId?: string;
    event: string;
    payload: unknown;
  };
