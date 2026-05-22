import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const targets = [
  { type: "js", file: path.join(rootDir, "src") },
  { type: "html", file: path.join(rootDir, "index.html") },
  { type: "css", file: path.join(rootDir, "assets", "styles.css") },
];

const rules = {
  js: [
    { label: "fetch() usage", regex: /\bfetch\s*\(/g },
    { label: "XMLHttpRequest usage", regex: /\bXMLHttpRequest\b/g },
    { label: "WebSocket usage", regex: /\bWebSocket\b/g },
    { label: "EventSource usage", regex: /\bEventSource\b/g },
    { label: "sendBeacon usage", regex: /\bnavigator\.sendBeacon\s*\(/g },
    { label: "external importScripts() usage", regex: /\bimportScripts\s*\(\s*["']https?:\/\//g },
  ],
  html: [
    { label: "external <script> source", regex: /<script\b[^>]*\bsrc=["']https?:\/\//gi },
    { label: "external <link> resource", regex: /<link\b[^>]*\bhref=["']https?:\/\//gi },
    { label: "external media source", regex: /<(?:img|iframe|audio|video|source)\b[^>]*\bsrc=["']https?:\/\//gi },
    { label: "external <form> action", regex: /<form\b[^>]*\baction=["']https?:\/\//gi },
  ],
  css: [
    { label: "external @import", regex: /@import\s+(?:url\()?\s*["']https?:\/\//gi },
    { label: "external url()", regex: /url\(\s*["']?https?:\/\//gi },
  ],
};

const findings = [];

for (const target of targets) {
  if (target.type === "js") {
    const jsFiles = await collectFiles(target.file, [".js", ".mjs"]);
    for (const file of jsFiles) {
      const content = await fs.readFile(file, "utf8");
      findings.push(...scanContent(file, content, rules.js));
    }
    continue;
  }

  const content = await fs.readFile(target.file, "utf8");
  findings.push(...scanContent(target.file, content, rules[target.type]));
}

if (findings.length > 0) {
  console.error("Privacy check failed. Remove runtime network access before shipping:");
  for (const finding of findings) {
    console.error(`- ${path.relative(rootDir, finding.file)}:${finding.line} ${finding.label}`);
  }
  process.exitCode = 1;
} else {
  console.log("Privacy check passed: no runtime network primitives or external page assets detected.");
}

async function collectFiles(directory, extensions) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath, extensions));
      continue;
    }

    if (extensions.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function scanContent(file, content, fileRules) {
  const matches = [];

  for (const rule of fileRules) {
    for (const match of content.matchAll(rule.regex)) {
      matches.push({
        file,
        label: rule.label,
        line: lineNumberAt(content, match.index ?? 0),
      });
    }
  }

  return matches;
}

function lineNumberAt(content, index) {
  let line = 1;

  for (let position = 0; position < index; position += 1) {
    if (content[position] === "\n") {
      line += 1;
    }
  }

  return line;
}
