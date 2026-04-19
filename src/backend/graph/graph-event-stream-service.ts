import { randomUUID } from "crypto";
import type WebSocket from "ws";
import type { RawData } from "ws";

import type { EventPayload, ScriptoriumEvent, ScriptoriumEventBus } from "../../utils/event-bus.js";
import type {
  GraphBroadcastMessage,
  GraphForecastResponseDTO,
  GraphLocale,
  GraphProjectionSnapshotDTO,
  GraphSocketHelloDTO,
  GraphTimelineResponseDTO,
} from "./graph-dtos.js";
import { GraphQueryService } from "./graph-query-service.js";

type Session = {
  id: string;
  socket: WebSocket;
  project: string;
  locale: GraphLocale;
};

type CachedGraphState = {
  version: number;
  snapshot: GraphProjectionSnapshotDTO;
  forecast: GraphForecastResponseDTO;
  timeline: GraphTimelineResponseDTO;
};

type SnapshotDiff = {
  nodeUpserts: GraphProjectionSnapshotDTO["nodes"];
  nodeRemovals: string[];
  edgeUpserts: GraphProjectionSnapshotDTO["edges"];
  edgeRemovals: string[];
};

export class GraphEventStreamService {
  private readonly sessions = new Map<string, Session>();
  private readonly cache = new Map<string, CachedGraphState>();
  private readonly refreshQueue = new Map<string, Promise<CachedGraphState>>();

  constructor(
    private readonly queryService: GraphQueryService,
    private readonly eventBus: ScriptoriumEventBus,
  ) {
    this.attachEventBus();
  }

  public async registerSocket(socket: WebSocket, project: string, locale: GraphLocale): Promise<string> {
    const session: Session = {
      id: randomUUID(),
      socket,
      project,
      locale,
    };

    this.sessions.set(session.id, session);
    socket.on("message", (raw: RawData) => {
      void this.handleSocketMessage(session.id, String(raw));
    });
    socket.on("close", () => {
      this.sessions.delete(session.id);
    });
    socket.on("error", () => {
      this.sessions.delete(session.id);
    });

    const hello: GraphSocketHelloDTO = {
      connectionId: session.id,
      project,
      locale,
      timestamp: new Date().toISOString(),
      capabilities: this.queryService.getCapabilities(),
    };

    this.sendMessage(session.socket, {
      kind: "update",
      event: "graph.connected",
      eventId: randomUUID(),
      locale,
      project,
      timestamp: hello.timestamp,
      version: this.cache.get(this.cacheKey(project, locale))?.version ?? 0,
      payload: hello,
    });

    await this.sendFullState(session, "initial.connect");
    return session.id;
  }

  public async broadcastProject(project: string, reason = "graph.refresh"): Promise<void> {
    const projectSessions = Array.from(this.sessions.values()).filter((session) => session.project === project);
    if (projectSessions.length === 0) {
      return;
    }

    const locales = Array.from(new Set(projectSessions.map((session) => session.locale)));
    for (const locale of locales) {
      const previous = this.cache.get(this.cacheKey(project, locale));
      const next = await this.refreshState(project, locale);
      const diff = previous ? this.diffSnapshots(previous.snapshot, next.snapshot) : null;

      for (const session of projectSessions.filter((item) => item.locale === locale)) {
        if (!previous || !diff || this.diffSize(diff) > 36) {
          this.sendSnapshot(session.socket, next);
        } else {
          this.sendDiff(session.socket, session, next, diff, reason);
        }

        this.sendMessage(session.socket, {
          kind: "update",
          event: "graph.timeline.updated",
          eventId: randomUUID(),
          locale,
          project,
          timestamp: new Date().toISOString(),
          version: next.version,
          payload: next.timeline,
        });

        this.sendMessage(session.socket, {
          kind: "update",
          event: "graph.forecast.updated",
          eventId: randomUUID(),
          locale,
          project,
          timestamp: new Date().toISOString(),
          version: next.version,
          payload: next.forecast,
        });
      }
    }
  }

  private attachEventBus(): void {
    const relevantEvents: ScriptoriumEvent[] = [
      "project.created",
      "project.deleted",
      "world.updated",
      "character.created",
      "character.updated",
      "chapter.created",
      "chapter.appended",
      "fact.registered",
      "lore.checked",
      "outline.updated",
    ];

    for (const event of relevantEvents) {
      this.eventBus.on(event, (payload: EventPayload) => {
        void this.broadcastProject(payload.project, event);
      });
    }
  }

  private async handleSocketMessage(sessionId: string, raw: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    let message: { type?: string } | null = null;
    try {
      message = JSON.parse(raw) as { type?: string };
    } catch {
      return;
    }

    if (message?.type === "refresh") {
      const next = await this.refreshState(session.project, session.locale);
      this.sendSnapshot(session.socket, next);
      this.sendMessage(session.socket, {
        kind: "update",
        event: "graph.timeline.updated",
        eventId: randomUUID(),
        locale: session.locale,
        project: session.project,
        timestamp: new Date().toISOString(),
        version: next.version,
        payload: next.timeline,
      });
      this.sendMessage(session.socket, {
        kind: "update",
        event: "graph.forecast.updated",
        eventId: randomUUID(),
        locale: session.locale,
        project: session.project,
        timestamp: new Date().toISOString(),
        version: next.version,
        payload: next.forecast,
      });
    }
  }

  private async sendFullState(session: Session, reason: string): Promise<void> {
    const next = await this.refreshState(session.project, session.locale);
    this.sendSnapshot(session.socket, next);

    this.sendMessage(session.socket, {
      kind: "update",
      event: "graph.timeline.updated",
      eventId: randomUUID(),
      locale: session.locale,
      project: session.project,
      timestamp: new Date().toISOString(),
      version: next.version,
      payload: next.timeline,
    });

    this.sendMessage(session.socket, {
      kind: "update",
      event: "graph.forecast.updated",
      eventId: randomUUID(),
      locale: session.locale,
      project: session.project,
      timestamp: new Date().toISOString(),
      version: next.version,
      payload: next.forecast,
    });

    this.sendMessage(session.socket, {
      kind: "update",
      event: "graph.snapshot.ready",
      eventId: randomUUID(),
      locale: session.locale,
      project: session.project,
      timestamp: new Date().toISOString(),
      version: next.version,
      payload: { reason },
    });
  }

  private sendSnapshot(socket: WebSocket, state: CachedGraphState): void {
    this.sendMessage(socket, {
      kind: "snapshot",
      eventId: randomUUID(),
      locale: state.snapshot.locale,
      project: state.snapshot.project,
      timestamp: new Date().toISOString(),
      version: state.version,
      snapshot: state.snapshot,
    });
  }

  private sendDiff(socket: WebSocket, session: Session, state: CachedGraphState, diff: SnapshotDiff, reason: string): void {
    for (const node of diff.nodeUpserts) {
      this.sendMessage(socket, {
        kind: "update",
        event: "graph.node.upserted",
        eventId: randomUUID(),
        locale: session.locale,
        project: session.project,
        timestamp: new Date().toISOString(),
        version: state.version,
        payload: { item: node, reason },
      });
    }

    for (const id of diff.nodeRemovals) {
      this.sendMessage(socket, {
        kind: "update",
        event: "graph.node.removed",
        eventId: randomUUID(),
        locale: session.locale,
        project: session.project,
        timestamp: new Date().toISOString(),
        version: state.version,
        payload: { id, reason },
      });
    }

    for (const edge of diff.edgeUpserts) {
      this.sendMessage(socket, {
        kind: "update",
        event: "graph.edge.upserted",
        eventId: randomUUID(),
        locale: session.locale,
        project: session.project,
        timestamp: new Date().toISOString(),
        version: state.version,
        payload: { item: edge, reason },
      });
    }

    for (const id of diff.edgeRemovals) {
      this.sendMessage(socket, {
        kind: "update",
        event: "graph.edge.removed",
        eventId: randomUUID(),
        locale: session.locale,
        project: session.project,
        timestamp: new Date().toISOString(),
        version: state.version,
        payload: { id, reason },
      });
    }
  }

  private async refreshState(project: string, locale: GraphLocale): Promise<CachedGraphState> {
    const key = this.cacheKey(project, locale);
    const inFlight = this.refreshQueue.get(key);
    if (inFlight) {
      return inFlight;
    }

    const refreshPromise = (async () => {
      const [snapshot, forecast, timeline] = await Promise.all([
        this.queryService.getSnapshot(project, { locale }),
        this.queryService.getForecast(project, { locale }),
        this.queryService.getTimeline(project, { locale }),
      ]);

      const previous = this.cache.get(key);
      const next: CachedGraphState = {
        version: (previous?.version ?? 0) + 1,
        snapshot,
        forecast,
        timeline,
      };
      this.cache.set(key, next);
      return next;
    })();

    this.refreshQueue.set(key, refreshPromise);
    try {
      return await refreshPromise;
    } finally {
      this.refreshQueue.delete(key);
    }
  }

  private diffSnapshots(previous: GraphProjectionSnapshotDTO, next: GraphProjectionSnapshotDTO): SnapshotDiff {
    const previousNodes = new Map(previous.nodes.map((node) => [node.id, JSON.stringify(node)]));
    const previousEdges = new Map(previous.edges.map((edge) => [edge.id, JSON.stringify(edge)]));

    const nodeUpserts = next.nodes.filter((node) => previousNodes.get(node.id) !== JSON.stringify(node));
    const nodeRemovals = previous.nodes.filter((node) => !next.nodes.some((candidate) => candidate.id === node.id)).map((node) => node.id);
    const edgeUpserts = next.edges.filter((edge) => previousEdges.get(edge.id) !== JSON.stringify(edge));
    const edgeRemovals = previous.edges.filter((edge) => !next.edges.some((candidate) => candidate.id === edge.id)).map((edge) => edge.id);

    return { nodeUpserts, nodeRemovals, edgeUpserts, edgeRemovals };
  }

  private diffSize(diff: SnapshotDiff): number {
    return diff.nodeUpserts.length + diff.nodeRemovals.length + diff.edgeUpserts.length + diff.edgeRemovals.length;
  }

  private cacheKey(project: string, locale: GraphLocale): string {
    return `${project}:${locale}`;
  }

  private sendMessage(socket: WebSocket, message: GraphBroadcastMessage): void {
    if (socket.readyState !== 1) return;
    socket.send(JSON.stringify(message));
  }
}
