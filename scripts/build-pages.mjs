import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getPublicScenarios } from "../lib/scenarios.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicDir = resolve(root, "public");
const apiBase = String(process.env.PUBLIC_API_BASE_URL ?? "").replace(/\/+$/u, "");
const requireApiBase = process.env.REQUIRE_API_BASE === "true";

if (requireApiBase && !apiBase) {
  throw new Error("PUBLIC_API_BASE_URL is required for the production Pages build.");
}

await mkdir(publicDir, { recursive: true });
await writeFile(
  resolve(publicDir, "scenarios.json"),
  `${JSON.stringify({ scenarios: getPublicScenarios() }, null, 2)}\n`,
  "utf8"
);
await writeFile(
  resolve(publicDir, "config.js"),
  `window.CHAT_RESCUE_API_BASE = ${JSON.stringify(apiBase)};\n`,
  "utf8"
);

console.log(
  `GitHub Pages files prepared (${apiBase ? "external API configured" : "static demo mode"}).`
);
