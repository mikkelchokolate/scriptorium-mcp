"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  type Node as FlowNode,
  Panel,
  ReactFlow,
  type NodeMouseHandler,
  type Edge,
  useStore,
  useViewport,
} from "@xyflow/react";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import { ScriptoriumNode } from "@/components/scriptorium-node";
import { createGraphSocket, fetchJson } from "@/lib/graph-client";
import { APP_LOCALES, localeName, t, type AppLocale } from "@/lib/i18n";
import type {
  GraphBroadcastMessage,
  GraphCapabilitiesDTO,
  GraphFlowEdgeDTO,
  GraphFlowNodeDTO,
  GraphForecastResponseDTO,
  GraphNodeDataDTO,
  GraphProjectionSnapshotDTO,
  GraphTimelineResponseDTO,
} from "@/lib/types";

const nodeTypes = {
  scriptorium: ScriptoriumNode,
};

type ExplorerFlowNode = FlowNode<GraphNodeDataDTO, "scriptorium">;
type GraphLane = "root" | "documents" | "characters" | "chapters" | "lore" | "entities" | "events";
type HandleSide = "left" | "right" | "top" | "bottom";
type AtlasOverviewProps = {
  nodes: GraphFlowNodeDTO[];
  selectedNodeId: string | null;
};

const LANE_X: Record<GraphLane, number> = {
  root: 60,
  documents: 420,
  characters: 840,
  chapters: 1240,
  lore: 1620,
  entities: 2000,
  events: 2380,
};

const LANE_Y_START: Record<GraphLane, number> = {
  root: 48,
  documents: 140,
  characters: 210,
  chapters: 180,
  lore: 240,
  entities: 200,
  events: 200,
};

const LANE_ROW_GAP: Record<GraphLane, number> = {
  root: 0,
  documents: 290,
  characters: 250,
  chapters: 290,
  lore: 250,
  entities: 260,
  events: 260,
};

const OVERVIEW_WIDTH = 220;
const OVERVIEW_HEIGHT = 160;
const OVERVIEW_NODE_WIDTH = 240;
const OVERVIEW_NODE_HEIGHT = 160;
const OVERVIEW_PADDING = 120;

function minimapNodeColor(node: ExplorerFlowNode): string {
  if (node.data.source === "neo4j") return "#1d5f66";

  switch (node.data.kind) {
    case "project":
      return "#a33e1b";
    case "world_bible":
    case "outline":
      return "#8d6a3f";
    case "chapter":
      return "#7e4f34";
    case "character":
      return "#a0623f";
    case "lore_fact":
      return "#c28a5c";
    default:
      return "#6b5744";
  }
}

function AtlasOverview({ nodes, selectedNodeId }: AtlasOverviewProps) {
  const viewport = useViewport();
  const { width: flowWidth, height: flowHeight } = useStore((state) => ({
    width: state.width,
    height: state.height,
  }));

  const bounds = useMemo(() => {
    if (!nodes.length) {
      return {
        minX: 0,
        minY: 0,
        width: 1,
        height: 1,
      };
    }

    const minX = Math.min(...nodes.map((node) => node.position.x)) - OVERVIEW_PADDING;
    const minY = Math.min(...nodes.map((node) => node.position.y)) - OVERVIEW_PADDING;
    const maxX = Math.max(...nodes.map((node) => node.position.x + OVERVIEW_NODE_WIDTH)) + OVERVIEW_PADDING;
    const maxY = Math.max(...nodes.map((node) => node.position.y + OVERVIEW_NODE_HEIGHT)) + OVERVIEW_PADDING;

    return {
      minX,
      minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  }, [nodes]);

  const scale = Math.min(OVERVIEW_WIDTH / bounds.width, OVERVIEW_HEIGHT / bounds.height);
  const offsetX = (OVERVIEW_WIDTH - bounds.width * scale) / 2;
  const offsetY = (OVERVIEW_HEIGHT - bounds.height * scale) / 2;
  const viewportRect = {
    x: ((-viewport.x / viewport.zoom) - bounds.minX) * scale + offsetX,
    y: ((-viewport.y / viewport.zoom) - bounds.minY) * scale + offsetY,
    width: (flowWidth / viewport.zoom) * scale,
    height: (flowHeight / viewport.zoom) * scale,
  };

  return (
    <Panel position="bottom-right">
      <div className="atlas-overview">
        <svg
          className="atlas-overview__svg"
          width={OVERVIEW_WIDTH}
          height={OVERVIEW_HEIGHT}
          viewBox={`0 0 ${OVERVIEW_WIDTH} ${OVERVIEW_HEIGHT}`}
          aria-hidden="true"
        >
          <rect
            x="0"
            y="0"
            width={OVERVIEW_WIDTH}
            height={OVERVIEW_HEIGHT}
            rx="22"
            fill="rgba(247, 238, 225, 0.96)"
          />
          {nodes.map((node) => {
            const x = (node.position.x - bounds.minX) * scale + offsetX;
            const y = (node.position.y - bounds.minY) * scale + offsetY;
            const width = Math.max(12, OVERVIEW_NODE_WIDTH * scale);
            const height = Math.max(8, OVERVIEW_NODE_HEIGHT * scale);
            const isSelected = node.id === selectedNodeId;

            return (
              <rect
                key={node.id}
                x={x}
                y={y}
                width={width}
                height={height}
                rx={Math.min(8, height / 2)}
                fill={isSelected ? "#b64920" : minimapNodeColor({ data: node.data } as ExplorerFlowNode)}
                stroke={isSelected ? "#7d2e15" : "#6b4d35"}
                strokeWidth={isSelected ? 1.8 : 1.2}
                opacity={0.95}
              />
            );
          })}
          <rect
            x={viewportRect.x}
            y={viewportRect.y}
            width={Math.max(18, viewportRect.width)}
            height={Math.max(12, viewportRect.height)}
            rx="8"
            fill="rgba(255, 251, 245, 0.78)"
            stroke="rgba(166, 120, 77, 0.45)"
            strokeWidth="1.2"
          />
        </svg>
      </div>
    </Panel>
  );
}

function laneForKind(kind: GraphNodeDataDTO["kind"]): GraphLane {
  switch (kind) {
    case "project":
      return "root";
    case "world_bible":
    case "outline":
      return "documents";
    case "character":
      return "characters";
    case "chapter":
      return "chapters";
    case "lore_fact":
      return "lore";
    case "entity":
      return "entities";
    case "event":
      return "events";
    default:
      return "entities";
  }
}

function laneSortWeight(node: GraphFlowNodeDTO): number {
  switch (node.data.kind) {
    case "project":
      return 0;
    case "world_bible":
      return 10;
    case "outline":
      return 20;
    case "character":
      return 30;
    case "chapter":
      return 40;
    case "lore_fact":
      return 50;
    case "entity":
      return 60;
    case "event":
      return 70;
    default:
      return 100;
  }
}

function sortNodes(left: GraphFlowNodeDTO, right: GraphFlowNodeDTO): number {
  const weightDiff = laneSortWeight(left) - laneSortWeight(right);
  if (weightDiff !== 0) return weightDiff;

  const chapterDiff = (left.data.chapter ?? Number.MAX_SAFE_INTEGER) - (right.data.chapter ?? Number.MAX_SAFE_INTEGER);
  if (chapterDiff !== 0) return chapterDiff;

  return left.data.label.value.localeCompare(right.data.label.value);
}

function normalizeGraphLabel(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function buildNodeIndex(nodes: GraphFlowNodeDTO[]): Map<string, GraphFlowNodeDTO> {
  return new Map(nodes.map((node) => [node.id, node]));
}

function buildVisibleEdges(nodes: GraphFlowNodeDTO[], edges: GraphFlowEdgeDTO[]): GraphFlowEdgeDTO[] {
  return edges.filter((edge) => !isLowSignalStructuralEdge(edge, nodes));
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function positionLaneNodes(
  lane: GraphLane,
  laneNodes: GraphFlowNodeDTO[],
  hints: Map<string, number>,
  positioned: Map<string, GraphFlowNodeDTO>,
): void {
  const items = [...laneNodes]
    .sort(sortNodes)
    .map((node) => ({
      node,
      hint: hints.get(node.id) ?? LANE_Y_START[lane] + laneSortWeight(node) * 2,
      weight: laneSortWeight(node),
    }))
    .sort((left, right) => {
      const hintDiff = left.hint - right.hint;
      if (hintDiff !== 0) return hintDiff;
      const weightDiff = left.weight - right.weight;
      if (weightDiff !== 0) return weightDiff;
      return left.node.data.label.value.localeCompare(right.node.data.label.value);
    });

  let nextAvailableY = LANE_Y_START[lane];

  for (const { node, hint } of items) {
    const y = Math.max(nextAvailableY, hint);
    positioned.set(node.id, {
      ...node,
      position: {
        x: LANE_X[lane],
        y,
      },
    });
    nextAvailableY = y + LANE_ROW_GAP[lane];
  }
}

function layoutSnapshotNodes(nodes: GraphFlowNodeDTO[], edges: GraphFlowEdgeDTO[]): GraphFlowNodeDTO[] {
  const grouped = new Map<GraphLane, GraphFlowNodeDTO[]>();
  const positioned = new Map<string, GraphFlowNodeDTO>();
  const visibleEdges = buildVisibleEdges(nodes, edges);
  const nodeIndex = buildNodeIndex(nodes);

  for (const node of nodes) {
    const lane = laneForKind(node.data.kind);
    const bucket = grouped.get(lane);
    if (bucket) {
      bucket.push(node);
    } else {
      grouped.set(lane, [node]);
    }
  }

  const rootNodes = [...(grouped.get("root") ?? [])].sort(sortNodes);
  rootNodes.forEach((node) => {
    positioned.set(node.id, {
      ...node,
      position: { x: LANE_X.root, y: LANE_Y_START.root },
    });
  });

  positionLaneNodes("documents", grouped.get("documents") ?? [], new Map(), positioned);
  positionLaneNodes("chapters", grouped.get("chapters") ?? [], new Map(), positioned);

  const chapterHints = new Map<string, number>();
  for (const edge of visibleEdges) {
    const source = nodeIndex.get(edge.source);
    const target = nodeIndex.get(edge.target);
    if (!source || !target) continue;

    if (source.data.kind === "chapter" && target.data.kind === "character") {
      const chapterY = positioned.get(source.id)?.position.y;
      if (typeof chapterY === "number") {
        const current = chapterHints.get(target.id);
        chapterHints.set(target.id, current == null ? chapterY : (current + chapterY) / 2);
      }
    }
  }

  positionLaneNodes("characters", grouped.get("characters") ?? [], chapterHints, positioned);

  const characterByLabel = new Map<string, GraphFlowNodeDTO>();
  for (const node of grouped.get("characters") ?? []) {
    characterByLabel.set(normalizeGraphLabel(node.data.label.value), node);
  }

  const loreHints = new Map<string, number>();
  for (const loreNode of grouped.get("lore") ?? []) {
    const hintValues: number[] = [];
    const matchingCharacter = characterByLabel.get(normalizeGraphLabel(loreNode.data.label.value));

    if (matchingCharacter) {
      const matchingCharacterY = positioned.get(matchingCharacter.id)?.position.y;
      if (typeof matchingCharacterY === "number") hintValues.push(matchingCharacterY);
    }

    for (const edge of visibleEdges) {
      if (edge.target !== loreNode.id && edge.source !== loreNode.id) continue;

      const peerId = edge.target === loreNode.id ? edge.source : edge.target;
      const peerY = positioned.get(peerId)?.position.y;
      if (typeof peerY === "number") hintValues.push(peerY);
    }

    const hint = average(hintValues);
    if (typeof hint === "number") loreHints.set(loreNode.id, hint);
  }

  positionLaneNodes("lore", grouped.get("lore") ?? [], loreHints, positioned);
  positionLaneNodes("entities", grouped.get("entities") ?? [], new Map(), positioned);
  positionLaneNodes("events", grouped.get("events") ?? [], new Map(), positioned);

  return nodes.map((node) => positioned.get(node.id) ?? node);
}

function sideHandleId(handleType: "source" | "target", side: HandleSide): string {
  return `${handleType}-${side}`;
}

function chooseHandleSides(sourceNode: GraphFlowNodeDTO, targetNode: GraphFlowNodeDTO, edge: GraphFlowEdgeDTO): {
  source: HandleSide;
  target: HandleSide;
} {
  const sourceCenter = {
    x: sourceNode.position.x + 120,
    y: sourceNode.position.y + 84,
  };
  const targetCenter = {
    x: targetNode.position.x + 120,
    y: targetNode.position.y + 84,
  };
  const horizontalDirection = targetCenter.x >= sourceCenter.x ? "right" : "left";
  const verticalDirection = targetCenter.y >= sourceCenter.y ? "bottom" : "top";
  const sameColumn = Math.abs(targetCenter.x - sourceCenter.x) < 180;

  if (sourceNode.data.kind === "chapter" && targetNode.data.kind === "character") {
    return { source: "left", target: "right" };
  }

  if (sourceNode.data.kind === "chapter" && targetNode.data.kind === "lore_fact") {
    if (!sameColumn && targetCenter.x > sourceCenter.x) {
      return { source: "right", target: "left" };
    }

    return { source: "bottom", target: "top" };
  }

  if (sourceNode.data.kind === "project") {
    return { source: "right", target: "left" };
  }

  if (sameColumn) {
    return {
      source: verticalDirection,
      target: verticalDirection === "bottom" ? "top" : "bottom",
    };
  }

  if (Math.abs(targetCenter.x - sourceCenter.x) >= Math.abs(targetCenter.y - sourceCenter.y) * 0.75) {
    return {
      source: horizontalDirection,
      target: horizontalDirection === "right" ? "left" : "right",
    };
  }

  return {
    source: verticalDirection,
    target: verticalDirection === "bottom" ? "top" : "bottom",
  };
}

function nodeMatches(node: GraphFlowNodeDTO, query: string): boolean {
  if (!query) return true;
  const haystack = [
    node.id,
    node.data.label.value,
    node.data.subtitle?.value,
    node.data.description?.value,
    node.data.kind,
  ].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function edgeMatches(edge: GraphFlowEdgeDTO, query: string): boolean {
  if (!query) return true;
  const haystack = [edge.id, edge.type, edge.data.label.value].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function upsertNode(nodes: GraphFlowNodeDTO[], nextNode: GraphFlowNodeDTO): GraphFlowNodeDTO[] {
  const existingIndex = nodes.findIndex((node) => node.id === nextNode.id);
  if (existingIndex === -1) return [...nodes, nextNode];
  const clone = [...nodes];
  clone[existingIndex] = nextNode;
  return clone;
}

function upsertEdge(edges: GraphFlowEdgeDTO[], nextEdge: GraphFlowEdgeDTO): GraphFlowEdgeDTO[] {
  const existingIndex = edges.findIndex((edge) => edge.id === nextEdge.id);
  if (existingIndex === -1) return [...edges, nextEdge];
  const clone = [...edges];
  clone[existingIndex] = nextEdge;
  return clone;
}

function isLowSignalStructuralEdge(edge: GraphFlowEdgeDTO, nodes: GraphFlowNodeDTO[]): boolean {
  if (edge.type !== "contains") return false;

  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);
  if (!source || !target) return false;

  return source.data.kind === "project" && !["world_bible", "outline"].includes(target.data.kind);
}

export function GraphExplorer({ locale, project }: { locale: AppLocale; project: string }) {
  const router = useRouter();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const manualCloseRef = useRef(false);

  const [snapshot, setSnapshot] = useState<GraphProjectionSnapshotDTO | null>(null);
  const [forecast, setForecast] = useState<GraphForecastResponseDTO | null>(null);
  const [timeline, setTimeline] = useState<GraphTimelineResponseDTO | null>(null);
  const [capabilities, setCapabilities] = useState<GraphCapabilitiesDTO | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<"connecting" | "live" | "offline">("connecting");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeRiskId, setActiveRiskId] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(search);
  const activeRisk = forecast?.risks.find((risk) => risk.id === activeRiskId) ?? null;

  const selectedNode = snapshot?.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const layoutedNodes = useMemo(() => snapshot ? layoutSnapshotNodes(snapshot.nodes, snapshot.edges) : [] as GraphFlowNodeDTO[], [snapshot]);

  const filteredNodes = useMemo(() => {
    return layoutedNodes.filter((node) => nodeMatches(node, deferredSearch));
  }, [deferredSearch, layoutedNodes]);

  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    if (!snapshot) return [] as GraphFlowEdgeDTO[];
    return snapshot.edges.filter((edge) => {
      if (isLowSignalStructuralEdge(edge, layoutedNodes)) return false;
      if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) return false;
      return true;
    });
  }, [deferredSearch, layoutedNodes, snapshot, visibleNodeIds]);
  const visibleNodeMap = useMemo(() => new Map(filteredNodes.map((node) => [node.id, node])), [filteredNodes]);

  const flowNodes = useMemo<ExplorerFlowNode[]>(() => filteredNodes.map((node) => ({
    id: node.id,
    type: "scriptorium",
    position: node.position,
    data: {
      ...node.data,
      isSelected: selectedNodeId === node.id,
    },
    draggable: false,
    selectable: true,
    style: activeRisk?.nodeIds?.includes(node.id)
      ? { boxShadow: "0 0 0 4px rgba(163, 62, 27, 0.18)" }
      : undefined,
  })), [activeRisk?.nodeIds, filteredNodes, selectedNodeId]);

  const flowEdges = useMemo<Edge[]>(() => filteredEdges.map((edge) => {
    const sourceNode = visibleNodeMap.get(edge.source);
    const targetNode = visibleNodeMap.get(edge.target);
    const handles = sourceNode && targetNode
      ? chooseHandleSides(sourceNode, targetNode, edge)
      : { source: "right" as HandleSide, target: "left" as HandleSide };

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: sideHandleId("source", handles.source),
      targetHandle: sideHandleId("target", handles.target),
      type: "smoothstep",
      pathOptions: {
        borderRadius: 18,
        offset: 20,
      },
      animated: Boolean(activeRisk?.edgeIds?.includes(edge.id) || edge.data.causal?.forecastHorizonChapters),
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "#7e4f34" },
      style: activeRisk?.edgeIds?.includes(edge.id)
        ? { stroke: "#a33e1b", strokeWidth: 2.4 }
        : edge.data.source === "neo4j"
          ? { stroke: "#1d5f66", strokeWidth: 1.9 }
          : { stroke: "#7e4f34", strokeWidth: 1.4 },
    };
  }), [activeRisk?.edgeIds, filteredEdges, visibleNodeMap]);

  const fetchAll = useEffectEvent(async () => {
    try {
      setLoading(true);
      setError(null);
      const [snapshotResponse, forecastResponse, timelineResponse, capabilitiesResponse] = await Promise.all([
        fetchJson<GraphProjectionSnapshotDTO>(`/api/projects/${encodeURIComponent(project)}/graph?locale=${locale}`),
        fetchJson<GraphForecastResponseDTO>(`/api/projects/${encodeURIComponent(project)}/graph/forecast?locale=${locale}&horizon=10`),
        fetchJson<GraphTimelineResponseDTO>(`/api/projects/${encodeURIComponent(project)}/graph/timeline?locale=${locale}`),
        fetchJson<GraphCapabilitiesDTO>("/api/capabilities"),
      ]);

      startTransition(() => {
        setSnapshot(snapshotResponse);
        setForecast(forecastResponse);
        setTimeline(timelineResponse);
        setCapabilities(capabilitiesResponse);
        setSelectedNodeId((current) => current ?? snapshotResponse.nodes[0]?.id ?? null);
      });
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setLoading(false);
    }
  });

  const applyMessage = useEffectEvent((message: GraphBroadcastMessage) => {
    if (message.kind === "snapshot") {
      startTransition(() => {
        setSnapshot(message.snapshot);
        setSelectedNodeId((current) => current ?? message.snapshot.nodes[0]?.id ?? null);
      });
      return;
    }

    if (message.event === "graph.forecast.updated") {
      setForecast(message.payload as GraphForecastResponseDTO);
      return;
    }

    if (message.event === "graph.timeline.updated") {
      setTimeline(message.payload as GraphTimelineResponseDTO);
      return;
    }

    if (message.event === "graph.node.upserted") {
      const payload = message.payload as { item: GraphFlowNodeDTO };
      setSnapshot((current) => current ? { ...current, nodes: upsertNode(current.nodes, payload.item) } : current);
      return;
    }

    if (message.event === "graph.node.removed") {
      const payload = message.payload as { id: string };
      setSnapshot((current) => current ? {
        ...current,
        nodes: current.nodes.filter((node) => node.id !== payload.id),
        edges: current.edges.filter((edge) => edge.source !== payload.id && edge.target !== payload.id),
      } : current);
      return;
    }

    if (message.event === "graph.edge.upserted") {
      const payload = message.payload as { item: GraphFlowEdgeDTO };
      setSnapshot((current) => current ? { ...current, edges: upsertEdge(current.edges, payload.item) } : current);
      return;
    }

    if (message.event === "graph.edge.removed") {
      const payload = message.payload as { id: string };
      setSnapshot((current) => current ? { ...current, edges: current.edges.filter((edge) => edge.id !== payload.id) } : current);
    }
  });

  useEffect(() => {
    void fetchAll();
  }, [fetchAll, locale, project]);

  useEffect(() => {
    manualCloseRef.current = false;

    const connect = () => {
      setConnectionState("connecting");
      const socket = createGraphSocket(project, locale);
      socketRef.current = socket;

      socket.onopen = () => {
        setConnectionState("live");
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as GraphBroadcastMessage;
          applyMessage(message);
        } catch {
          // ignore malformed payloads
        }
      };

      socket.onerror = () => {
        socket.close();
      };

      socket.onclose = () => {
        if (manualCloseRef.current) return;
        setConnectionState("offline");
        reconnectRef.current = window.setTimeout(() => {
          void fetchAll();
          connect();
        }, 1500);
      };
    };

    connect();

    return () => {
      manualCloseRef.current = true;
      if (reconnectRef.current) {
        window.clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [locale, project]);

  const handleRefresh = () => {
    socketRef.current?.send(JSON.stringify({ type: "refresh" }));
    void fetchAll();
  };

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    setSelectedNodeId(node.id);
  };

  if (loading && !snapshot) {
    return <main className="explorer"><div className="loading">{t(locale, "loadingGraph")}</div></main>;
  }

  if (error && !snapshot) {
    return <main className="explorer"><div className="error-state">{error}</div></main>;
  }

  return (
    <main className="explorer">
      <section className="explorer__main">
        <div className="toolbar">
          <div className="toolbar__heading">
            <div className="hero__eyebrow">{t(locale, "explorerEyebrow")}</div>
            <h1>{decodeURIComponent(project)}</h1>
            <div className="badge-row">
              <span className={`connection-pill ${connectionState === "live" ? "pill--active" : ""}`}>
                {connectionState === "live" ? t(locale, "live") : connectionState === "connecting" ? t(locale, "connecting") : t(locale, "offline")}
              </span>
              {capabilities?.neo4jConnected ? <span className="pill">Neo4j</span> : <span className="pill">{t(locale, "fileMode")}</span>}
              {snapshot ? <span className="pill">{t(locale, "nodesCount", { count: String(snapshot.nodes.length) })}</span> : null}
              {snapshot ? <span className="pill">{t(locale, "edgesCount", { count: String(snapshot.edges.length) })}</span> : null}
            </div>
          </div>

          <div className="toolbar__actions">
            {APP_LOCALES.map((nextLocale) => (
              <Link
                key={nextLocale}
                className={`pill ${nextLocale === locale ? "pill--active" : ""}`}
                href={`/${nextLocale}/project/${encodeURIComponent(project)}`}
              >
                {localeName(nextLocale)}
              </Link>
            ))}
            <button className="button" type="button" onClick={handleRefresh}>{t(locale, "refresh")}</button>
            <button className="button button--ghost" type="button" onClick={() => router.push(`/${locale}`)}>{t(locale, "back")}</button>
            <input
              className="text-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t(locale, "searchPlaceholder")}
            />
          </div>
        </div>

        <div className="flow-frame">
          {snapshot ? (
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              fitView
              connectionMode={ConnectionMode.Loose}
              elementsSelectable={false}
              onNodeClick={handleNodeClick}
              nodesFocusable
              edgesFocusable
            >
              <Controls showInteractive={false} />
              <AtlasOverview nodes={filteredNodes} selectedNodeId={selectedNodeId} />
              <Background
                variant={BackgroundVariant.Lines}
                color="rgba(95, 74, 58, 0.06)"
                gap={44}
                size={1}
              />
              <Panel position="top-left">
                <div className="pill">{t(locale, "snapshotSource", { source: snapshot.source })}</div>
              </Panel>
            </ReactFlow>
          ) : (
            <div className="empty-state">{t(locale, "noGraphData")}</div>
          )}
        </div>
      </section>

      <aside className="explorer__side">
        <section className="side-card">
          <div className="panel__eyebrow">{t(locale, "snapshotSummary")}</div>
          <h3>{t(locale, "overview")}</h3>
          <div className="stats-grid">
            <div className="metric"><span>{t(locale, "charactersSimple")}</span><strong>{snapshot?.summary.characters ?? 0}</strong></div>
            <div className="metric"><span>{t(locale, "chaptersSimple")}</span><strong>{snapshot?.summary.chapters ?? 0}</strong></div>
            <div className="metric"><span>{t(locale, "loreFactsSimple")}</span><strong>{snapshot?.summary.loreFacts ?? 0}</strong></div>
            <div className="metric"><span>{t(locale, "entitiesSimple")}</span><strong>{snapshot?.summary.entities ?? 0}</strong></div>
          </div>
        </section>

        <section className="side-card">
          <div className="panel__eyebrow">{t(locale, "selectedNode")}</div>
          <h3>{selectedNode?.data.label.value ?? t(locale, "nothingSelected")}</h3>
          {selectedNode ? (
            <div className="detail-card">
              {selectedNode.data.subtitle ? <div className="small"><strong>{selectedNode.data.subtitle.value}</strong></div> : null}
              {selectedNode.data.description ? <div className="small">{selectedNode.data.description.value}</div> : null}
              <div className="badge-row">
                <span className="tag">{selectedNode.data.kind}</span>
                <span className="tag">{selectedNode.data.source}</span>
                {selectedNode.data.chapter ? <span className="tag">Ch. {selectedNode.data.chapter}</span> : null}
              </div>
              {selectedNode.data.temporal ? (
                <div className="small">
                  {t(locale, "temporal")}: {selectedNode.data.temporal.start ?? `Ch. ${selectedNode.data.temporal.chapterSpanStart ?? "?"}`}
                  {selectedNode.data.temporal.end ? ` -> ${selectedNode.data.temporal.end}` : ""}
                </div>
              ) : null}
              {selectedNode.data.causal?.forecastHorizonChapters ? (
                <div className="small">
                  {t(locale, "forecastWindow")}: +{selectedNode.data.causal.forecastHorizonChapters}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="empty-state">{t(locale, "pickNode")}</div>
          )}
        </section>

        <section className="side-card">
          <div className="panel__eyebrow">{t(locale, "forecastEyebrow")}</div>
          <h3>{t(locale, "forecastTitle")}</h3>
          <div className="small muted">{t(locale, "forecastCopy")}</div>
          <div className="badge-row">
            <span className="pill">{t(locale, "forecastCount", { count: String(forecast?.summary.total ?? 0) })}</span>
            <span className="pill">{t(locale, "criticalCount", { count: String(forecast?.summary.critical ?? 0) })}</span>
          </div>
          <div className="risk-list">
            {forecast?.risks.length ? forecast.risks.map((risk) => (
              <button
                key={risk.id}
                className={`risk-card risk-card--${risk.severity} ${activeRiskId === risk.id ? "is-active" : ""}`}
                type="button"
                onClick={() => setActiveRiskId((current) => current === risk.id ? null : risk.id)}
              >
                <div className="badge-row">
                  <span className="tag">{risk.severity}</span>
                  <span className="tag">{risk.confidence.toFixed(2)}</span>
                </div>
                <h4>{risk.title.value}</h4>
                <div className="small">{risk.summary.value}</div>
                <div className="small">{t(locale, "impactedChapters", { chapters: risk.impactedChapters.join(", ") || "-" })}</div>
              </button>
            )) : <div className="empty-state">{t(locale, "noForecastRisks")}</div>}
          </div>
        </section>

        <section className="side-card">
          <div className="panel__eyebrow">{t(locale, "timelineEyebrow")}</div>
          <h3>{t(locale, "timelineTitle")}</h3>
          <div className="timeline-list">
            {timeline?.entries.length ? timeline.entries.map((entry) => (
              <div key={entry.id} className="timeline-card">
                <div className="badge-row">
                  <span className="tag">Ch. {entry.chapter}</span>
                  <span className="tag">{entry.source}</span>
                </div>
                <h4>{entry.label.value}</h4>
                {entry.description ? <div className="small">{entry.description.value}</div> : null}
              </div>
            )) : <div className="empty-state">{t(locale, "noTimeline")}</div>}
          </div>
        </section>
      </aside>
    </main>
  );
}
