export type GraphLocale = "en" | "ru";

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

export interface GraphLocalizedText {
  en?: string;
  ru?: string;
}

export interface GraphResolvedText extends GraphLocalizedText {
  locale: GraphLocale;
  value: string;
  fallbackLocale: GraphLocale;
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

export interface GraphBroadcastSnapshotMessage {
  kind: "snapshot";
  project: string;
  locale: GraphLocale;
  timestamp: string;
  version: number;
  snapshot: GraphProjectionSnapshotDTO;
}

export interface GraphBroadcastUpdateMessage<TPayload = unknown> {
  kind: "update";
  project: string;
  locale: GraphLocale;
  timestamp: string;
  version: number;
  event: string;
  payload: TPayload;
}

export type GraphBroadcastMessage<TPayload = unknown> =
  | GraphBroadcastSnapshotMessage
  | GraphBroadcastUpdateMessage<TPayload>;

export type GraphBroadcastListener = (message: GraphBroadcastMessage) => void;
