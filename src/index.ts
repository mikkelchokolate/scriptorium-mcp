#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadScriptoriumEnv } from "./utils/env-loader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadScriptoriumEnv(path.join(__dirname, ".."));

await import("./server.js");
