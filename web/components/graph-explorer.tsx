"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Background,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  type Node as FlowNode,
  Panel,
  ReactFlow,
  type Edge,
  type NodeMouseHandler,
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
import { alternateLocale, localeName, t, type AppLocale } from "@/lib/i18n";
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

export function GraphExplorer({ locale, project }: { locale: AppLocale; project: string }) {
  const router = useRouter();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);

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

  const filteredNodes = useMemo(() => {
    if (!snapshot) return [] as GraphFlowNodeDTO[];
    return snapshot.nodes.filter((node) => nodeMatches(node, deferredSearch));
  }, [deferredSearch, snapshot]);

  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    if (!snapshot) return [] as GraphFlowEdgeDTO[];
    return snapshot.edges.filter((edge) => {
      if (edgeMatches(edge, deferredSearch)) return true;
      return visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target);
    });
  }, [deferredSearch, snapshot, visibleNodeIds]);

  const flowNodes = useMemo<ExplorerFlowNode[]>(() => filteredNodes.map((node) => ({
    id: node.id,
    type: "scriptorium",
    position: node.position,
    data: node.data,
    draggable: false,
    selectable: true,
    style: activeRisk?.nodeIds?.includes(node.id)
      ? { boxShadow: "0 0 0 4px rgba(163, 62, 27, 0.18)" }
      : undefined,
  })), [activeRisk?.nodeIds, filteredNodes]);

  const flowEdges = useMemo<Edge[]>(() => filteredEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
    label: edge.data.label.value,
    animated: Boolean(activeRisk?.edgeIds?.includes(edge.id) || edge.data.causal?.forecastHorizonChapters),
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "#7e4f34" },
    style: activeRisk?.edgeIds?.includes(edge.id)
      ? { stroke: "#a33e1b", strokeWidth: 2.4 }
      : edge.data.source === "neo4j"
        ? { stroke: "#1d5f66", strokeWidth: 1.9 }
        : { stroke: "#7e4f34", strokeWidth: 1.4 },
  })), [activeRisk?.edgeIds, filteredEdges]);

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
      setConnectionState("offline");
    };

    socket.onclose = () => {
      setConnectionState("offline");
      reconnectRef.current = window.setTimeout(() => {
        void fetchAll();
      }, 1500);
    };

    return () => {
      if (reconnectRef.current) {
        window.clearTimeout(reconnectRef.current);
      }
      socket.close();
      socketRef.current = null;
    };
  }, [applyMessage, fetchAll, locale, project]);

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
            <Link className="pill pill--active" href={`/${locale}/project/${encodeURIComponent(project)}`}>{localeName(locale)}</Link>
            <Link className="pill" href={`/${alternateLocale(locale)}/project/${encodeURIComponent(project)}`}>{localeName(alternateLocale(locale))}</Link>
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
              onNodeClick={handleNodeClick}
              nodesFocusable
              edgesFocusable
            >
              <MiniMap pannable zoomable nodeStrokeWidth={3} />
              <Controls showInteractive={false} />
              <Background color="rgba(66, 46, 26, 0.12)" gap={24} />
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
                  {selectedNode.data.temporal.end ? ` → ${selectedNode.data.temporal.end}` : ""}
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
