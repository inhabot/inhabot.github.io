import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = __dirname;
const OUTPUT_PATH = path.join(ROOT, "index.html");
const EXTRA_OUTPUT_PATH = path.join(ROOT, "통합문제지.html");

const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: false,
});

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripFrontmatter(raw) {
  const normalized = raw.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n*/);

  if (!match) {
    return { attrs: {}, body: normalized.trim() };
  }

  return {
    attrs: parseFrontmatter(match[1]),
    body: normalized.slice(match[0].length).trim(),
  };
}

function parseFrontmatter(block) {
  const attrs = {};

  for (const line of block.split("\n")) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    const value = rawValue.trim();

    if (value.startsWith("[") && value.endsWith("]")) {
      const items = value
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.replace(/^["']|["']$/g, ""));
      attrs[key] = items;
      continue;
    }

    attrs[key] = value.replace(/^["']|["']$/g, "");
  }

  return attrs;
}

function wrapTables(html) {
  return html.replace(
    /<table>([\s\S]*?)<\/table>/g,
    '<div class="table-wrap"><table>$1</table></div>'
  );
}

function normalizeInlineArtifacts(source) {
  return source
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/<작성방법>/g, "&lt;작성방법&gt;")
    .replace(/<\/작성방법>/g, "&lt;/작성방법&gt;");
}

function renderMarkdown(source) {
  return wrapTables(md.render(normalizeInlineArtifacts(source).trim()));
}

function renderCallout(type, title, body) {
  const safeTitle = escapeHtml(title || "");
  const bodyHtml = renderMarkdown(body);

  if (type === "answer") {
    const summary = safeTitle || "답안 및 해설 보기";
    return `
<details class="answer-toggle">
  <summary>
    <span class="summary-label" data-closed="${summary}" data-open="답안 및 해설 닫기">${summary}</span>
    <span class="summary-caret" aria-hidden="true">⌄</span>
  </summary>
  <div class="answer-body">${bodyHtml}</div>
</details>`.trim();
  }

  const label = safeTitle || (type === "important" ? "중요" : "안내");
  return `
<aside class="callout callout-${escapeHtml(type)}">
  <div class="callout-label">${label}</div>
  <div class="callout-body">${bodyHtml}</div>
</aside>`.trim();
}

function transformCallouts(source) {
  const lines = normalizeInlineArtifacts(source).split("\n");
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const calloutMatch = line.match(/^>\s*\[!([A-Za-z0-9_-]+)\](-)?\s*(.*)$/);

    if (!calloutMatch) {
      output.push(line);
      continue;
    }

    const type = calloutMatch[1].toLowerCase();
    const title = calloutMatch[3].trim();
    const bodyLines = [];

    index += 1;
    while (index < lines.length && /^>\s?/.test(lines[index])) {
      bodyLines.push(lines[index].replace(/^>\s?/, ""));
      index += 1;
    }
    index -= 1;

    output.push(renderCallout(type, title, bodyLines.join("\n").trim()));
  }

  return output.join("\n");
}

function slugify(text) {
  return String(text)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseQuestionHeading(heading) {
  const cleaned = heading.replace(/^##\s+/, "").trim();
  const match = cleaned.match(/^문제\s+(\d+)(?:\s*[—-]\s*(.+))?$/);

  if (!match) {
    return {
      localNumber: null,
      title: cleaned,
    };
  }

  return {
    localNumber: Number(match[1]),
    title: (match[2] || `문제 ${match[1]}`).trim(),
  };
}

function parseDocument(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { attrs, body } = stripFrontmatter(raw);
  const relatedIndex = body.search(/^##\s+Related Concepts\b/m);
  const trimmedBody = (relatedIndex >= 0 ? body.slice(0, relatedIndex) : body).trim();
  const titleMatch = trimmedBody.match(/^#\s+(.+)$/m);
  const documentTitle = titleMatch ? titleMatch[1].trim() : path.basename(filePath, ".md");
  const afterTitle = titleMatch
    ? trimmedBody.slice(titleMatch.index + titleMatch[0].length).trim()
    : trimmedBody;
  const questionRegex = /^##\s+문제[^\n]*$/gm;
  const matches = [...afterTitle.matchAll(questionRegex)];
  const intro = matches.length ? afterTitle.slice(0, matches[0].index).trim() : afterTitle.trim();
  const questions = [];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const heading = match[0];
    const start = match.index + heading.length;
    const end = index + 1 < matches.length ? matches[index + 1].index : afterTitle.length;
    const content = afterTitle.slice(start, end).trim();
    const parsedHeading = parseQuestionHeading(heading);

    questions.push({
      localNumber: parsedHeading.localNumber,
      title: parsedHeading.title,
      contentHtml: renderMarkdown(transformCallouts(content)),
    });
  }

  return {
    id: slugify(path.basename(filePath, ".md")),
    fileName: path.basename(filePath),
    title: documentTitle,
    attrs,
    introHtml: intro ? renderMarkdown(transformCallouts(intro)) : "",
    questions,
  };
}

function buildSections() {
  const files = fs
    .readdirSync(ROOT)
    .filter((name) => name.endsWith(".md"))
    .sort((left, right) => left.localeCompare(right, "ko", { numeric: true, sensitivity: "base" }));

  return files.map((file) => parseDocument(path.join(ROOT, file)));
}

function buildHtml(sections) {
  let globalIndex = 1;

  const sectionMarkup = sections
    .map((section, sectionIndex) => {
      const firstQuestionNumber = globalIndex;
      const questionMarkup = section.questions
        .map((question) => {
          const questionNumber = globalIndex;
          globalIndex += 1;

          return `
            <article class="question-card" id="q-${String(questionNumber).padStart(2, "0")}">
              <header class="question-head">
                <div class="question-index">${questionNumber}</div>
                <div class="question-copy">
                  <div class="question-meta">
                    <span class="question-badge">문항 ${questionNumber}</span>
                    ${
                      question.localNumber
                        ? `<span class="question-badge question-badge-subtle">원본 문제 ${question.localNumber}</span>`
                        : ""
                    }
                  </div>
                  <h3 class="question-title">${escapeHtml(question.title)}</h3>
                </div>
              </header>
              <div class="question-content">${question.contentHtml}</div>
            </article>
          `;
        })
        .join("");

      const lastQuestionNumber = globalIndex - 1;
      const part = section.attrs.part ? `<span class="meta-chip">${escapeHtml(section.attrs.part)}</span>` : "";
      const source =
        section.attrs.source_pdf ? `<span class="meta-chip">${escapeHtml(section.attrs.source_pdf)}</span>` : "";

      section.questionRange = `${firstQuestionNumber}-${lastQuestionNumber}`;

      return `
        <section class="paper-section" id="${section.id}">
          <header class="section-head">
            <div class="section-topline">
              <span class="section-label">SECTION ${sectionIndex + 1}</span>
              <span class="section-range">문항 ${firstQuestionNumber}~${lastQuestionNumber}</span>
            </div>
            <h2 class="section-title">${escapeHtml(section.title)}</h2>
            <div class="section-meta">
              ${part}
              ${source}
            </div>
          </header>
          <div class="question-stack">${questionMarkup}</div>
        </section>
      `;
    })
    .join("");

  const totalQuestions = globalIndex - 1;
  const drawerMarkup = sections
    .map(
      (section, index) => `
        <a class="drawer-link" href="#${section.id}">
          <strong>${index + 1}. ${escapeHtml(section.title)}</strong>
          <span>문항 ${section.questionRange}</span>
        </a>
      `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>SB 모의고사</title>
    <style>
      :root {
        --bg: #d9d0bf;
        --bg-soft: #efe5d2;
        --paper: #fbf6eb;
        --paper-strong: #fffdf7;
        --ink: #1f1a17;
        --ink-soft: #62574d;
        --line: rgba(70, 54, 40, 0.14);
        --line-strong: rgba(110, 77, 49, 0.22);
        --accent: #8f2f22;
        --accent-soft: rgba(143, 47, 34, 0.1);
        --stamp: #b7492f;
        --shadow: 0 18px 40px rgba(54, 41, 29, 0.16);
        --radius-lg: 28px;
        --radius-md: 20px;
        --radius-sm: 14px;
      }

      * {
        box-sizing: border-box;
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "MaruBuri", "KoPubWorldBatang", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
        color: var(--ink);
        overflow-x: hidden;
        background:
          radial-gradient(circle at top, rgba(255, 255, 255, 0.42), transparent 28%),
          linear-gradient(180deg, #e8dfcf 0%, var(--bg) 100%);
      }

      a,
      button,
      summary {
        font: inherit;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      code {
        font-family: "SFMono-Regular", "Menlo", "Consolas", monospace;
        font-size: 0.92em;
      }

      .shell {
        position: relative;
        width: 100%;
      }

      .topbar {
        position: sticky;
        top: 0;
        z-index: 40;
        display: flex;
        align-items: center;
        gap: 14px;
        padding: calc(env(safe-area-inset-top) + 14px) 16px 14px;
        background: rgba(251, 246, 235, 0.92);
        backdrop-filter: blur(16px);
        border-bottom: 1px solid rgba(70, 54, 40, 0.08);
      }

      .menu-btn {
        width: 48px;
        height: 48px;
        border: 0;
        border-radius: 16px;
        background: var(--paper-strong);
        box-shadow: 0 10px 22px rgba(54, 41, 29, 0.12);
        display: grid;
        place-items: center;
        cursor: pointer;
      }

      .menu-icon {
        width: 20px;
        height: 14px;
        display: grid;
        gap: 4px;
      }

      .menu-icon span {
        display: block;
        height: 2px;
        border-radius: 999px;
        background: var(--ink);
      }

      .top-copy {
        min-width: 0;
        flex: 1 1 auto;
      }

      .eyebrow {
        margin: 0 0 4px;
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        font-weight: 800;
        color: var(--accent);
      }

      .top-title {
        margin: 0;
        font-size: 18px;
        line-height: 1.2;
      }

      .top-subtitle {
        margin: 4px 0 0;
        font-size: 12px;
        color: var(--ink-soft);
      }

      .drawer {
        position: fixed;
        inset: 0 auto 0 0;
        z-index: 50;
        width: min(88vw, 360px);
        max-width: 100%;
        padding: calc(env(safe-area-inset-top) + 18px) 16px 22px;
        background:
          linear-gradient(180deg, rgba(249, 241, 226, 0.98), rgba(255, 251, 245, 0.98)),
          var(--paper);
        border-right: 1px solid rgba(70, 54, 40, 0.12);
        box-shadow: 24px 0 50px rgba(54, 41, 29, 0.18);
        transform: translateX(-102%);
        transition: transform 220ms ease;
        overflow-y: auto;
      }

      .drawer.is-open {
        transform: translateX(0);
      }

      .drawer-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 18px;
      }

      .drawer-title {
        margin: 0;
        font-size: 18px;
      }

      .drawer-copy {
        margin: 6px 0 0;
        font-size: 13px;
        line-height: 1.6;
        color: var(--ink-soft);
      }

      .drawer-close {
        width: 42px;
        height: 42px;
        border: 0;
        border-radius: 14px;
        background: rgba(143, 47, 34, 0.1);
        color: var(--ink);
        font-size: 18px;
        cursor: pointer;
      }

      .drawer-nav {
        display: grid;
        gap: 10px;
      }

      .drawer-link {
        display: block;
        padding: 14px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.72);
        border: 1px solid rgba(70, 54, 40, 0.08);
        box-shadow: 0 10px 18px rgba(54, 41, 29, 0.08);
      }

      .drawer-link strong {
        display: block;
        font-size: 14px;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }

      .drawer-link span {
        display: block;
        margin-top: 6px;
        font-size: 12px;
        color: var(--ink-soft);
        overflow-wrap: anywhere;
      }

      .overlay {
        position: fixed;
        inset: 0;
        z-index: 45;
        background: rgba(28, 22, 17, 0.38);
        opacity: 0;
        pointer-events: none;
        transition: opacity 220ms ease;
      }

      .overlay.is-open {
        opacity: 1;
        pointer-events: auto;
      }

      main {
        padding: 16px 14px 44px;
      }

      .paper-section {
        margin-top: 16px;
        padding: 18px;
        border-radius: var(--radius-lg);
        background:
          linear-gradient(180deg, rgba(255, 253, 247, 0.98), rgba(249, 244, 235, 0.98)),
          var(--paper);
        border: 1px solid rgba(70, 54, 40, 0.1);
        box-shadow: 0 16px 34px rgba(54, 41, 29, 0.12);
        scroll-margin-top: 92px;
      }

      .section-head {
        margin-bottom: 16px;
        padding-bottom: 16px;
        border-bottom: 1px dashed var(--line-strong);
      }

      .section-topline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }

      .section-label,
      .section-range,
      .meta-chip {
        display: inline-flex;
        align-items: center;
        min-height: 32px;
        padding: 7px 12px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 800;
        max-width: 100%;
        line-height: 1.35;
        white-space: normal;
        overflow-wrap: anywhere;
      }

      .section-label {
        background: rgba(143, 47, 34, 0.1);
        color: var(--accent);
      }

      .section-range {
        background: rgba(32, 24, 19, 0.06);
        color: var(--ink-soft);
      }

      .section-title {
        margin: 12px 0 10px;
        font-size: 24px;
        line-height: 1.28;
      }

      .section-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .meta-chip {
        background: rgba(32, 24, 19, 0.05);
        color: var(--ink-soft);
        font-weight: 700;
      }

      .question-stack {
        display: grid;
        gap: 16px;
      }

      .question-card {
        padding: 16px;
        border-radius: 22px;
        background: var(--paper-strong);
        border: 1px solid rgba(70, 54, 40, 0.1);
      }

      .question-head {
        display: grid;
        grid-template-columns: 58px 1fr;
        gap: 14px;
        align-items: start;
        margin-bottom: 14px;
      }

      .question-index {
        width: 58px;
        height: 58px;
        border-radius: 18px;
        background: linear-gradient(180deg, #a43e2c, #81281d);
        color: #fff9f2;
        display: grid;
        place-items: center;
        font-size: 22px;
        font-weight: 800;
        box-shadow: 0 10px 20px rgba(129, 40, 29, 0.2);
      }

      .question-copy {
        min-width: 0;
      }

      .question-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .question-badge {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(143, 47, 34, 0.09);
        color: var(--accent);
        font-size: 11px;
        font-weight: 800;
        max-width: 100%;
        line-height: 1.35;
        white-space: normal;
        overflow-wrap: anywhere;
      }

      .question-badge-subtle {
        background: rgba(32, 24, 19, 0.06);
        color: var(--ink-soft);
      }

      .question-title {
        margin: 10px 0 0;
        font-size: 20px;
        line-height: 1.34;
      }

      .question-content {
        font-size: 15px;
        line-height: 1.84;
        color: var(--ink);
      }

      .question-content > *:first-child {
        margin-top: 0;
      }

      .question-content > *:last-child {
        margin-bottom: 0;
      }

      .question-content h1,
      .question-content h2,
      .question-content h3,
      .question-content h4,
      .question-content h5,
      .question-content h6 {
        margin: 20px 0 10px;
        font-size: 17px;
      }

      .question-content p,
      .question-content ul,
      .question-content ol,
      .question-content blockquote {
        margin: 10px 0;
      }

      .question-content ul,
      .question-content ol {
        padding-left: 20px;
      }

      .question-content li + li {
        margin-top: 5px;
      }

      .question-content blockquote {
        margin-left: 0;
        margin-right: 0;
        padding: 14px 16px;
        border-left: 4px solid rgba(143, 47, 34, 0.22);
        border-radius: 0 16px 16px 0;
        background: rgba(143, 47, 34, 0.05);
        color: #473d35;
      }

      .callout {
        margin: 12px 0;
        padding: 14px;
        border-radius: 18px;
        border: 1px solid rgba(70, 54, 40, 0.1);
        background: rgba(255, 251, 244, 0.82);
      }

      .callout-important {
        background: rgba(143, 47, 34, 0.06);
        border-color: rgba(143, 47, 34, 0.16);
      }

      .callout-label {
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--accent);
        margin-bottom: 8px;
      }

      .callout-body > *:first-child,
      .answer-body > *:first-child {
        margin-top: 0;
      }

      .callout-body > *:last-child,
      .answer-body > *:last-child {
        margin-bottom: 0;
      }

      .answer-toggle {
        margin: 14px 0 6px;
        border-radius: 18px;
        background: rgba(143, 47, 34, 0.05);
        border: 1px solid rgba(143, 47, 34, 0.12);
        overflow: hidden;
      }

      .answer-toggle summary {
        list-style: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px;
        cursor: pointer;
        font-weight: 800;
        color: var(--accent);
      }

      .summary-label {
        flex: 1 1 auto;
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .answer-toggle summary::-webkit-details-marker {
        display: none;
      }

      .summary-caret {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: rgba(143, 47, 34, 0.09);
        transition: transform 180ms ease;
      }

      .answer-toggle[open] .summary-caret {
        transform: rotate(180deg);
      }

      .answer-body {
        padding: 0 16px 16px;
        color: var(--ink);
      }

      .table-wrap {
        overflow-x: auto;
        margin: 14px 0;
        border-radius: 18px;
        border: 1px solid rgba(70, 54, 40, 0.1);
        background: rgba(255, 253, 247, 0.92);
      }

      table {
        width: 100%;
        min-width: 0;
        max-width: 100%;
        border-collapse: collapse;
        border-spacing: 0;
        table-layout: fixed;
      }

      th,
      td {
        padding: 12px 10px;
        border: 1px solid rgba(70, 54, 40, 0.08);
        vertical-align: top;
        text-align: left;
        word-break: break-word;
        overflow-wrap: anywhere;
      }

      th {
        background: rgba(143, 47, 34, 0.08);
        color: var(--accent);
        font-weight: 800;
      }

      hr {
        border: 0;
        border-top: 1px dashed rgba(70, 54, 40, 0.18);
        margin: 18px 0;
      }

      @media (max-width: 380px) {
        .topbar {
          gap: 10px;
          padding: calc(env(safe-area-inset-top) + 12px) 12px 12px;
        }

        .menu-btn {
          width: 42px;
          height: 42px;
          border-radius: 14px;
        }

        .top-title {
          font-size: 16px;
        }

        .top-subtitle {
          font-size: 11px;
          line-height: 1.45;
        }

        .drawer {
          width: min(90vw, 320px);
          padding: calc(env(safe-area-inset-top) + 16px) 12px 18px;
        }

        .drawer-link {
          padding: 12px;
          border-radius: 16px;
        }

        main {
          padding: 12px 10px 32px;
        }

        .paper-section {
          margin-top: 12px;
          padding: 14px;
          border-radius: 22px;
        }

        .section-head {
          margin-bottom: 14px;
          padding-bottom: 14px;
        }

        .section-title {
          margin: 10px 0 8px;
          font-size: 20px;
        }

        .question-stack {
          gap: 12px;
        }

        .question-card {
          padding: 13px;
          border-radius: 18px;
        }

        .question-head {
          grid-template-columns: 46px 1fr;
          gap: 10px;
          margin-bottom: 12px;
        }

        .question-index {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          font-size: 18px;
        }

        .question-title {
          margin-top: 8px;
          font-size: 17px;
        }

        .question-content {
          font-size: 14px;
          line-height: 1.72;
        }

        .question-content h1,
        .question-content h2,
        .question-content h3,
        .question-content h4,
        .question-content h5,
        .question-content h6 {
          font-size: 16px;
        }

        .question-content ul,
        .question-content ol {
          padding-left: 18px;
        }

        .question-content blockquote,
        .callout,
        .answer-toggle summary,
        .answer-body {
          padding-left: 12px;
          padding-right: 12px;
        }

        .question-content blockquote {
          padding-top: 12px;
          padding-bottom: 12px;
        }

        .callout,
        .answer-toggle {
          border-radius: 16px;
        }

        .summary-caret {
          width: 24px;
          height: 24px;
          flex: 0 0 24px;
        }

        th,
        td {
          padding: 10px 8px;
          font-size: 13px;
        }
      }

      @media (max-width: 340px) {
        .question-head {
          grid-template-columns: 1fr;
        }

        .question-index {
          width: 40px;
          height: 40px;
          border-radius: 12px;
        }

        .section-label,
        .section-range,
        .meta-chip,
        .question-badge {
          padding: 6px 9px;
          font-size: 11px;
        }

        th,
        td {
          padding: 8px 6px;
          font-size: 12px;
        }
      }

      @media (min-width: 760px) {
        main {
          max-width: 980px;
          margin: 0 auto;
          padding: 20px 24px 56px;
        }

        .topbar {
          padding-left: 24px;
          padding-right: 24px;
        }

        .paper-section {
          padding: 24px;
        }

        .question-card {
          padding: 20px;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <header class="topbar">
        <button
          type="button"
          class="menu-btn"
          id="menuButton"
          aria-expanded="false"
          aria-controls="drawer"
          aria-label="섹션 이동 메뉴 열기"
        >
          <span class="menu-icon" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
        <div class="top-copy">
          <p class="eyebrow">SB MOCK EXAM</p>
          <h1 class="top-title">SB 모의고사</h1>
          <p class="top-subtitle">${sections.length}개 파일 · 총 ${totalQuestions}문항 · 원문 중심</p>
        </div>
      </header>

      <aside class="drawer" id="drawer" aria-hidden="true">
        <div class="drawer-head">
          <div>
            <h2 class="drawer-title">섹션 이동</h2>
            <p class="drawer-copy">파일별 문제 묶음으로 바로 내려갑니다. 각 문제 안의 정답과 해설은 펼쳐서 확인할 수 있습니다.</p>
          </div>
          <button type="button" class="drawer-close" id="drawerClose" aria-label="메뉴 닫기">✕</button>
        </div>
        <nav class="drawer-nav" id="drawerNav">
          ${drawerMarkup}
        </nav>
      </aside>

      <div class="overlay" id="overlay" hidden></div>

      <main>
        ${sectionMarkup}
      </main>
    </div>

    <script>
      const drawer = document.getElementById("drawer");
      const overlay = document.getElementById("overlay");
      const menuButton = document.getElementById("menuButton");
      const drawerClose = document.getElementById("drawerClose");
      const drawerNav = document.getElementById("drawerNav");

      function openDrawer() {
        drawer.classList.add("is-open");
        overlay.hidden = false;
        requestAnimationFrame(() => overlay.classList.add("is-open"));
        drawer.setAttribute("aria-hidden", "false");
        menuButton.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
      }

      function closeDrawer() {
        drawer.classList.remove("is-open");
        overlay.classList.remove("is-open");
        drawer.setAttribute("aria-hidden", "true");
        menuButton.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
        window.setTimeout(() => {
          if (!overlay.classList.contains("is-open")) {
            overlay.hidden = true;
          }
        }, 220);
      }

      menuButton.addEventListener("click", () => {
        if (drawer.classList.contains("is-open")) {
          closeDrawer();
          return;
        }
        openDrawer();
      });

      drawerClose.addEventListener("click", closeDrawer);
      overlay.addEventListener("click", closeDrawer);

      drawerNav.addEventListener("click", (event) => {
        const link = event.target.closest("a");
        if (!link) {
          return;
        }
        closeDrawer();
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && drawer.classList.contains("is-open")) {
          closeDrawer();
        }
      });

      document.addEventListener(
        "toggle",
        (event) => {
          const details = event.target;
          if (!(details instanceof HTMLDetailsElement) || !details.classList.contains("answer-toggle")) {
            return;
          }

          const label = details.querySelector(".summary-label");
          if (!label) {
            return;
          }

          const closedText = label.dataset.closed || "답안 및 해설 보기";
          const openText = label.dataset.open || "답안 및 해설 닫기";
          label.textContent = details.open ? openText : closedText;
        },
        true
      );
    </script>
  </body>
</html>
`;
}

function main() {
  const sections = buildSections();
  const html = buildHtml(sections);
  fs.writeFileSync(OUTPUT_PATH, html, "utf8");
  fs.writeFileSync(EXTRA_OUTPUT_PATH, html, "utf8");

  const questionCount = sections.reduce((sum, section) => sum + section.questions.length, 0);
  console.log(`Rendered ${sections.length} sections and ${questionCount} questions.`);
  console.log(`- ${OUTPUT_PATH}`);
  console.log(`- ${EXTRA_OUTPUT_PATH}`);
}

main();
