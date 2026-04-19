import { spawn } from "node:child_process";

const action = process.argv[2];

const actionMap = {
  up: ["compose", "up", "neo4j", "-d"],
  down: ["compose", "stop", "neo4j"],
  logs: ["compose", "logs", "-f", "neo4j"],
};

if (!actionMap[action]) {
  console.error('Usage: node scripts/neo4j-compose.mjs <up|down|logs>');
  process.exit(1);
}

const child = spawn("docker", actionMap[action], {
  cwd: process.cwd(),
  stdio: "inherit",
});

child.on("error", (error) => {
  if (error.code === "ENOENT") {
    console.error("[Scriptorium] Docker Desktop is not installed or not available in PATH.");
    console.error("[Scriptorium] Install Docker Desktop, start it, then rerun this command.");
    process.exit(1);
    return;
  }

  console.error(`[Scriptorium] Failed to run docker compose: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
