import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";

import type { GraphCapabilitiesDTO } from "../backend/graph/graph-dtos.js";

function toLoopbackHost(host?: string): string {
  if (!host || host === "0.0.0.0") return "127.0.0.1";
  if (host === "::") return "::1";
  return host;
}

export function npmExecutable(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

export type ManagedWebExplorer = {
  readonly child: ChildProcess;
  readonly pid: number | undefined;
  close: () => Promise<void>;
  closeSync: () => void;
};

function webSpawnCommand(webDir: string, script: string): { command: string; args: string[] } {
  if (process.platform === "win32") {
    return {
      command: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", `npm --prefix web run ${script}`],
    };
  }

  return {
    command: npmExecutable(),
    args: ["--prefix", webDir, "run", script],
  };
}

export function isAutoStartEnabled(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return !["0", "false", "off", "no"].includes(value.trim().toLowerCase());
}

export async function isTcpPortOpen(port: number, host?: string): Promise<boolean> {
  const targetHost = toLoopbackHost(host);

  return new Promise((resolve) => {
    const socket = net.createConnection({ host: targetHost, port });
    const finish = (result: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(1000);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

export async function waitForPortState(
  port: number,
  host: string | undefined,
  expectedOpen: boolean,
  timeoutMs: number,
): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const open = await isTcpPortOpen(port, host);
    if (open === expectedOpen) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

export async function readGraphCapabilities(baseUrl: string): Promise<GraphCapabilitiesDTO | null> {
  try {
    const response = await fetch(`${baseUrl}/api/capabilities`);
    if (!response.ok) return null;
    return await response.json() as GraphCapabilitiesDTO;
  } catch {
    return null;
  }
}

type WindowsProcessInfo = {
  ProcessId?: number;
  Name?: string;
  CommandLine?: string;
};

function readWindowsProcessOnPort(port: number): WindowsProcessInfo | null {
  const script = [
    `$conn = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1`,
    "if ($conn) {",
    "  $ownerPid = $conn.OwningProcess",
    "  Get-CimInstance Win32_Process -Filter \"ProcessId = $ownerPid\" | Select-Object ProcessId, Name, CommandLine | ConvertTo-Json -Compress",
    "}",
  ].join("; ");

  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", script], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.status !== 0 || !result.stdout.trim()) return null;

  try {
    return JSON.parse(result.stdout.trim()) as WindowsProcessInfo;
  } catch {
    return null;
  }
}

function isScriptoriumProcess(commandLine: string | undefined, projectRoot: string): boolean {
  if (!commandLine) return false;
  const normalized = commandLine.replace(/\\/g, "/").toLowerCase();
  const normalizedRoot = projectRoot.replace(/\\/g, "/").toLowerCase();
  return normalized.includes(normalizedRoot) && (normalized.includes("/dist/index.js") || normalized.includes("/src/index.ts"));
}

function isScriptoriumWebProcess(commandLine: string | undefined, projectRoot: string): boolean {
  if (!commandLine) return false;
  const normalized = commandLine.replace(/\\/g, "/").toLowerCase();
  const normalizedRoot = projectRoot.replace(/\\/g, "/").toLowerCase();
  return normalized.includes(normalizedRoot)
    && normalized.includes("/web/")
    && normalized.includes("next/dist/bin/next");
}

async function stopProcessTree(pid: number | undefined): Promise<void> {
  if (!pid) return;

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Process already gone.
  }
}

function stopProcessTreeSync(pid: number | undefined): void {
  if (!pid) return;

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Process already gone.
  }
}

export async function replaceStaleGraphApiOnWindows(options: {
  port: number;
  projectRoot: string;
  currentHasNeo4j: boolean;
  existingCapabilities: GraphCapabilitiesDTO | null;
}): Promise<boolean> {
  if (process.platform !== "win32") return false;
  if (!options.currentHasNeo4j) return false;
  if (!options.existingCapabilities || options.existingCapabilities.neo4jConnected) return false;

  const processInfo = readWindowsProcessOnPort(options.port);
  if (!processInfo?.ProcessId || !isScriptoriumProcess(processInfo.CommandLine, options.projectRoot)) {
    return false;
  }

  const taskKill = spawnSync("taskkill", ["/PID", String(processInfo.ProcessId), "/T", "/F"], {
    stdio: "ignore",
    windowsHide: true,
  });

  if (taskKill.status !== 0) return false;
  return waitForPortState(options.port, "127.0.0.1", false, 5000);
}

async function replaceStaleWebExplorerOnWindows(options: {
  port: number;
  projectRoot: string;
}): Promise<boolean> {
  if (process.platform !== "win32") return false;

  const processInfo = readWindowsProcessOnPort(options.port);
  if (!processInfo?.ProcessId || !isScriptoriumWebProcess(processInfo.CommandLine, options.projectRoot)) {
    return false;
  }

  const taskKill = spawnSync("taskkill", ["/PID", String(processInfo.ProcessId), "/T", "/F"], {
    stdio: "ignore",
    windowsHide: true,
  });

  if (taskKill.status !== 0) return false;
  return waitForPortState(options.port, "127.0.0.1", false, 5000);
}

export async function maybeAutoStartWebExplorer(options: {
  projectRoot: string;
  graphHttpUrl: string;
  host?: string;
  port?: number;
}): Promise<ManagedWebExplorer | null> {
  if (!isAutoStartEnabled(process.env.SCRIPTORIUM_WEB_AUTOSTART, true)) return null;

  const webDir = path.join(options.projectRoot, "web");
  const packageJsonPath = path.join(webDir, "package.json");
  const nextModulePath = path.join(webDir, "node_modules", "next");
  if (!fs.existsSync(packageJsonPath) || !fs.existsSync(nextModulePath)) return null;

  const port = Number(process.env.SCRIPTORIUM_WEB_PORT ?? options.port ?? 3000);
  if (!Number.isFinite(port)) return null;

  const existingPortOpen = await isTcpPortOpen(port, options.host);
  if (existingPortOpen) {
    const replaced = await replaceStaleWebExplorerOnWindows({
      port,
      projectRoot: options.projectRoot,
    });

    if (!replaced) {
      return null;
    }
  }

  const hostname = options.host ?? process.env.SCRIPTORIUM_WEB_HOST ?? "127.0.0.1";
  const hasProductionBuild = fs.existsSync(path.join(webDir, ".next", "BUILD_ID"));
  const script = hasProductionBuild ? "start" : "dev";
  const spawnCommand = webSpawnCommand(webDir, script);
  const usePipeStdio = process.platform === "win32";

  try {
    const child = spawn(spawnCommand.command, spawnCommand.args, {
      cwd: options.projectRoot,
      detached: false,
      stdio: usePipeStdio ? ["ignore", "pipe", "pipe"] : "ignore",
      windowsHide: true,
      env: {
        ...process.env,
        PORT: String(port),
        HOSTNAME: hostname,
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_PUBLIC_SCRIPTORIUM_GRAPH_HTTP_URL: process.env.NEXT_PUBLIC_SCRIPTORIUM_GRAPH_HTTP_URL ?? options.graphHttpUrl,
        NEXT_PUBLIC_SCRIPTORIUM_GRAPH_WS_URL: process.env.NEXT_PUBLIC_SCRIPTORIUM_GRAPH_WS_URL
          ?? options.graphHttpUrl.replace(/^http/iu, "ws"),
      },
    });

    child.stdout?.resume();
    child.stderr?.resume();
    child.unref();

    return {
      child,
      pid: child.pid,
      close: async () => {
        await stopProcessTree(child.pid);
      },
      closeSync: () => {
        stopProcessTreeSync(child.pid);
      },
    };
  } catch (error) {
    console.error(`[Scriptorium] Web Explorer auto-start skipped: ${String(error)}`);
    return null;
  }
}
