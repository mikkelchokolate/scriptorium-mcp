import http from "http";
import { URL } from "url";
import { WebSocketServer, type WebSocket } from "ws";

import { GraphEventStreamService } from "./graph-event-stream-service.js";
import { GraphQueryService } from "./graph-query-service.js";
import { normalizeGraphLocale } from "./graph-utils.js";

type GraphApiServerOptions = {
  host?: string;
  port?: number;
  corsOrigin?: string;
};

export class GraphApiServer {
  private server?: http.Server;
  private readonly webSocketServer = new WebSocketServer({ noServer: true });

  constructor(
    private readonly queryService: GraphQueryService,
    private readonly eventStreamService: GraphEventStreamService,
    private readonly options: GraphApiServerOptions = {},
  ) {}

  public async start(): Promise<void> {
    if (this.server) return;

    this.server = http.createServer((req, res) => {
      void this.handleRequest(req, res);
    });

    this.server.on("upgrade", (req, socket, head) => {
      void this.handleUpgrade(req, socket, head);
    });

    const host = this.options.host ?? "0.0.0.0";
    const port = this.options.port ?? 4319;
    await new Promise<void>((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(port, host, () => {
        this.server!.off("error", reject);
        resolve();
      });
    });
  }

  public async close(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    this.server = undefined;
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const pathname = requestUrl.pathname;

    this.applyCors(res);
    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }

    if (req.method !== "GET") {
      this.writeJson(res, 405, { error: "Method not allowed" });
      return;
    }

    try {
      if (pathname === "/api/capabilities") {
        this.writeJson(res, 200, this.queryService.getCapabilities());
        return;
      }

      if (pathname === "/api/projects") {
        this.writeJson(res, 200, await this.queryService.listProjects());
        return;
      }

      const graphMatch = pathname.match(/^\/api\/projects\/([^/]+)\/graph$/);
      if (graphMatch) {
        const project = decodeURIComponent(graphMatch[1]);
        const locale = normalizeGraphLocale(requestUrl.searchParams.get("locale") ?? undefined);
        this.writeJson(res, 200, await this.queryService.getSnapshot(project, { locale }));
        return;
      }

      const timelineMatch = pathname.match(/^\/api\/projects\/([^/]+)\/graph\/timeline$/);
      if (timelineMatch) {
        const project = decodeURIComponent(timelineMatch[1]);
        const locale = normalizeGraphLocale(requestUrl.searchParams.get("locale") ?? undefined);
        this.writeJson(res, 200, await this.queryService.getTimeline(project, { locale }));
        return;
      }

      const forecastMatch = pathname.match(/^\/api\/projects\/([^/]+)\/graph\/forecast$/);
      if (forecastMatch) {
        const project = decodeURIComponent(forecastMatch[1]);
        const locale = normalizeGraphLocale(requestUrl.searchParams.get("locale") ?? undefined);
        const horizonRaw = Number(requestUrl.searchParams.get("horizon") ?? "10");
        this.writeJson(res, 200, await this.queryService.getForecast(project, { locale, horizon: horizonRaw }));
        return;
      }

      this.writeJson(res, 404, { error: "Not found" });
    } catch (error) {
      this.writeJson(res, 500, { error: String(error) });
    }
  }

  private async handleUpgrade(req: http.IncomingMessage, socket: any, head: Buffer): Promise<void> {
    const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const wsMatch = requestUrl.pathname.match(/^\/ws\/projects\/([^/]+)\/graph$/);
    if (!wsMatch) {
      socket.destroy();
      return;
    }

    const project = decodeURIComponent(wsMatch[1]);
    const locale = normalizeGraphLocale(requestUrl.searchParams.get("locale") ?? undefined);

    this.webSocketServer.handleUpgrade(req, socket, head, (ws: WebSocket) => {
      void this.eventStreamService.registerSocket(ws, project, locale);
    });
  }

  private applyCors(res: http.ServerResponse): void {
    res.setHeader("Access-Control-Allow-Origin", this.options.corsOrigin ?? "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  private writeJson(res: http.ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));
  }
}
