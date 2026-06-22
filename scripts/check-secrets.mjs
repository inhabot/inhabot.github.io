import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ignoredDirectories = new Set([".git", "node_modules"]);
const ignoredFiles = new Set([".env", ".env.local"]);
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".txt",
  ".yml",
  ".yaml"
]);
const secretPatterns = [
  { name: "OpenAI API key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/gu },
  { name: "GitHub token", pattern: /\bgh[ps]_[A-Za-z0-9]{30,}\b/gu }
];

async function collect(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    if (entry.isFile() && ignoredFiles.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(path)));
    if (entry.isFile() && textExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

const findings = [];
for (const file of await collect(root)) {
  const text = await readFile(file, "utf8");
  for (const { name, pattern } of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) findings.push(`${name}: ${relative(root, file)}`);
  }
}

if (findings.length > 0) {
  console.error(`Secret-like values found:\n${findings.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("No API keys or common repository tokens found in publishable files.");
}
