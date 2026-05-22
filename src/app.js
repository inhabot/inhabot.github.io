import JSZip from "jszip";
import { KORDOC_VERSION } from "./browser-kordoc.js";

const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
const TAB_PARSE = "parse";
const TAB_GENERATE = "generate";
const DEFAULT_OUTPUT_NAME = "document";
const MARKDOWN_SAMPLE = `# 주간 업무 보고서

## 이번 주 요약
- 공문서 초안 검토 완료
- 회의 메모를 Markdown으로 정리
- 배포용 문서 변환 절차 점검

## 진행 현황
| 항목 | 상태 | 비고 |
| --- | --- | --- |
| 민원 응답서 | 완료 | 팀장 검토 반영 |
| 사업 계획서 | 진행 중 | 표 정리 필요 |

> 대외 배포 전에는 마지막으로 표와 제목 계층을 다시 확인합니다.

\`\`\`
담당자: 홍길동
검토일: 2026-05-23
\`\`\`
`;
const THEME_PRESETS = {
  neutral: {
    label: "기본 잉크",
    options: {
      theme: {
        tableHeaderBold: true,
      },
    },
  },
  mint: {
    label: "민트 업무문서",
    options: {
      theme: {
        headingColors: {
          1: "#0b5b56",
          2: "#0f766e",
          3: "#15807b",
          4: "#2a8c84",
        },
        quoteColor: "#31554d",
        tableHeaderColor: "#0b5b56",
        tableHeaderBold: true,
      },
    },
  },
  amber: {
    label: "따뜻한 브리핑",
    options: {
      theme: {
        headingColors: {
          1: "#92400e",
          2: "#b45309",
          3: "#c97b12",
          4: "#d18f2c",
        },
        quoteColor: "#7c5b1a",
        tableHeaderColor: "#92400e",
        tableHeaderBold: true,
      },
    },
  },
};

const state = {
  activeTab: TAB_PARSE,
  nextJobId: 1,
  pending: new Map(),
  parse: {
    processing: false,
    records: [],
  },
  generate: {
    error: null,
    markdown: "",
    outputName: DEFAULT_OUTPUT_NAME,
    processing: false,
    result: null,
    sourceLabel: "직접 입력",
    themePreset: "neutral",
  },
};

const tabButtons = Array.from(document.querySelectorAll("[data-tab-button]"));
const tabPanels = Array.from(document.querySelectorAll("[data-tab-panel]"));
const dropzone = document.querySelector("[data-dropzone]");
const fileInput = document.querySelector("#fileInput");
const startButton = document.querySelector("#startButton");
const resetButton = document.querySelector("#resetButton");
const downloadAllButton = document.querySelector("#downloadAllButton");
const queueHint = document.querySelector("[data-queue-hint]");
const totalStat = document.querySelector("[data-stat-total]");
const successStat = document.querySelector("[data-stat-success]");
const failedStat = document.querySelector("[data-stat-failed]");
const results = document.querySelector("[data-results]");
const versionTexts = Array.from(document.querySelectorAll("[data-version]"));
const markdownInput = document.querySelector("#markdownInput");
const markdownFileInput = document.querySelector("#markdownFileInput");
const outputNameInput = document.querySelector("#outputNameInput");
const themePresetSelect = document.querySelector("#themePresetSelect");
const generateButton = document.querySelector("#generateButton");
const downloadHwpxButton = document.querySelector("#downloadHwpxButton");
const resetMarkdownButton = document.querySelector("#resetMarkdownButton");
const sampleMarkdownButton = document.querySelector("#sampleMarkdownButton");
const markdownMeta = document.querySelector("[data-markdown-meta]");
const generateHint = document.querySelector("[data-generate-hint]");
const generateSummary = document.querySelector("[data-generate-summary]");
const generateResult = document.querySelector("[data-generate-result]");

for (const versionText of versionTexts) {
  versionText.textContent = `kordoc ${KORDOC_VERSION}`;
}

worker.addEventListener("message", (event) => {
  const message = event.data;
  const pending = state.pending.get(message.id);
  if (!pending) {
    return;
  }

  if (message.type === "progress") {
    pending.onProgress?.(message);
    return;
  }

  state.pending.delete(message.id);

  if (message.type === "error") {
    pending.reject(new Error(message.error));
    return;
  }

  pending.resolve(message.result);
});

for (const button of tabButtons) {
  button.addEventListener("click", () => {
    state.activeTab = button.dataset.tab ?? TAB_PARSE;
    render();
  });
}

dropzone.addEventListener("dragover", (event) => {
  if (state.parse.processing) {
    return;
  }

  event.preventDefault();
  dropzone.dataset.dragging = "true";
});

dropzone.addEventListener("dragleave", () => {
  dropzone.dataset.dragging = "false";
});

dropzone.addEventListener("drop", (event) => {
  if (state.parse.processing) {
    return;
  }

  event.preventDefault();
  dropzone.dataset.dragging = "false";
  const files = Array.from(event.dataTransfer?.files ?? []).filter(isSupportedParseFile);
  if (files.length > 0) {
    setParseRecords(files);
  }
});

fileInput.addEventListener("change", () => {
  if (state.parse.processing) {
    return;
  }

  const files = Array.from(fileInput.files ?? []).filter(isSupportedParseFile);
  setParseRecords(files);
});

startButton.addEventListener("click", async () => {
  if (state.parse.processing || state.parse.records.length === 0) {
    return;
  }

  await startParseConversion();
});

resetButton.addEventListener("click", () => {
  resetParseState();
});

downloadAllButton.addEventListener("click", async () => {
  const succeeded = state.parse.records.filter((record) => record.result?.success);
  if (succeeded.length === 0) {
    return;
  }

  downloadAllButton.disabled = true;
  downloadAllButton.textContent = "ZIP 준비 중...";

  try {
    const zip = new JSZip();
    const usedNames = new Set();

    for (const record of succeeded) {
      const result = record.result;
      const baseName = sanitizeFilename(stripExtension(record.file.name));

      if (result.images?.length) {
        const folderName = uniqueName(baseName, usedNames);
        const folder = zip.folder(folderName);
        folder.file(`${baseName}.md`, result.markdown);

        for (const image of result.images) {
          folder.file(image.filename, image.data);
        }
        continue;
      }

      zip.file(uniqueName(`${baseName}.md`, usedNames), result.markdown);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, `kordoc-markdown-${timestamp()}.zip`);
  } finally {
    downloadAllButton.disabled = false;
    downloadAllButton.textContent = "모두 ZIP으로 다운로드";
  }
});

results.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement) || target.dataset.action !== "download") {
    return;
  }

  const id = Number(target.dataset.id);
  const record = state.parse.records.find((item) => item.id === id);
  if (!record?.result?.success) {
    return;
  }

  target.disabled = true;

  try {
    const { blob, filename } = await createDownload(record);
    downloadBlob(blob, filename);
  } finally {
    target.disabled = false;
  }
});

markdownInput.addEventListener("input", () => {
  setGenerateDraft(markdownInput.value, {
    clearResult: true,
  });
});

markdownFileInput.addEventListener("change", async () => {
  const [file] = Array.from(markdownFileInput.files ?? []).filter(isSupportedMarkdownFile);
  if (!file) {
    return;
  }

  try {
    const markdown = await file.text();
    setGenerateDraft(markdown, {
      clearResult: true,
      outputName: sanitizeFilename(stripExtension(file.name)),
      sourceLabel: file.name,
    });
  } catch (error) {
    state.generate.error = error instanceof Error ? error.message : "Markdown 파일을 읽지 못했습니다.";
    renderGenerate();
  } finally {
    markdownFileInput.value = "";
  }
});

outputNameInput.addEventListener("input", () => {
  state.generate.outputName = outputNameInput.value;
  renderGenerate();
});

themePresetSelect.addEventListener("change", () => {
  state.generate.themePreset = themePresetSelect.value;
  state.generate.result = null;
  state.generate.error = null;
  renderGenerate();
});

sampleMarkdownButton.addEventListener("click", () => {
  setGenerateDraft(MARKDOWN_SAMPLE, {
    clearResult: true,
    outputName: "weekly-briefing",
    sourceLabel: "예제 텍스트",
  });
});

generateButton.addEventListener("click", async () => {
  await startHwpxGeneration();
});

downloadHwpxButton.addEventListener("click", () => {
  if (!state.generate.result) {
    return;
  }

  const blob = new Blob([state.generate.result.buffer], { type: "application/hwp+zip" });
  downloadBlob(blob, currentHwpxFilename());
});

resetMarkdownButton.addEventListener("click", () => {
  resetGenerateState();
});

function setParseRecords(files) {
  state.parse.records = files.map((file, index) => ({
    file,
    id: index + 1,
    message: "변환을 시작하면 이 파일을 분석합니다.",
    progressText: "대기 중",
    status: "queued",
  }));

  queueHint.textContent = files.length > 0
    ? `${files.length}개 파일이 준비되었습니다. 변환 시작을 누르면 순서대로 Markdown으로 바뀝니다.`
    : "HWP 또는 HWPX 파일을 여러 개 올리면 한 번에 변환할 수 있습니다.";

  renderParse();
}

async function startParseConversion() {
  state.parse.processing = true;
  renderParse();

  try {
    for (const record of state.parse.records) {
      record.failure = undefined;
      record.message = "브라우저 안에서 안전하게 변환하고 있습니다.";
      record.progressText = "파일 읽는 중";
      record.result = undefined;
      record.status = "parsing";
      renderParse();

      try {
        const buffer = await record.file.arrayBuffer();
        record.progressText = "문서 분석 시작";
        renderParse();

        const result = await runWorkerJob(
          "parse-document",
          {
            buffer,
            fileName: record.file.name,
          },
          {
            onProgress(message) {
              record.progressText = `${message.current}/${message.total} 섹션 처리`;
              record.message = "문서를 분석하고 있습니다.";
              renderParse();
            },
            transfer: [buffer],
          },
        );

        if (result.success) {
          record.status = "done";
          record.result = result;
          record.message = summarizeResult(result);
          record.progressText = `${result.fileType.toUpperCase()} 완료`;
        } else {
          record.failure = result;
          record.message = result.error;
          record.progressText = result.code ?? "오류";
          record.status = "error";
        }
      } catch (error) {
        record.message = error instanceof Error ? error.message : "문서 변환 실패";
        record.progressText = "오류";
        record.status = "error";
      }

      renderParse();
    }
  } finally {
    state.parse.processing = false;
    renderParse();
  }
}

async function startHwpxGeneration() {
  if (state.generate.processing) {
    return;
  }

  if (state.generate.markdown.trim() === "") {
    state.generate.error = "Markdown을 먼저 입력해 주세요.";
    renderGenerate();
    return;
  }

  state.generate.processing = true;
  state.generate.error = null;
  state.generate.result = null;
  renderGenerate();

  try {
    const preset = THEME_PRESETS[state.generate.themePreset] ?? THEME_PRESETS.neutral;
    const result = await runWorkerJob("markdown-to-hwpx", {
      markdown: state.generate.markdown,
      options: preset.options,
    });

    if (result.success) {
      state.generate.result = {
        buffer: result.buffer,
        byteLength: result.byteLength,
      };
    } else {
      state.generate.error = result.error;
    }
  } catch (error) {
    state.generate.error = error instanceof Error ? error.message : "HWPX 생성 실패";
  } finally {
    state.generate.processing = false;
    renderGenerate();
  }
}

function runWorkerJob(action, payload, { onProgress, transfer = [] } = {}) {
  const id = state.nextJobId++;

  return new Promise((resolve, reject) => {
    state.pending.set(id, { onProgress, resolve, reject });
    worker.postMessage({ action, id, payload }, transfer);
  });
}

async function createDownload(record) {
  const result = record.result;
  const baseName = sanitizeFilename(stripExtension(record.file.name));

  if (!result.images?.length) {
    return {
      blob: new Blob([result.markdown], { type: "text/markdown;charset=utf-8" }),
      filename: `${baseName}.md`,
    };
  }

  const zip = new JSZip();
  zip.file(`${baseName}.md`, result.markdown);

  for (const image of result.images) {
    zip.file(image.filename, image.data);
  }

  return {
    blob: await zip.generateAsync({ type: "blob" }),
    filename: `${baseName}.zip`,
  };
}

function summarizeResult(result) {
  return [
    `${result.markdown.length.toLocaleString()}자`,
    result.pageCount ? `${result.pageCount}개 섹션` : null,
    result.images?.length ? `이미지 ${result.images.length}개` : null,
    result.warnings?.length ? `경고 ${result.warnings.length}건` : null,
  ].filter(Boolean).join(" · ");
}

function render() {
  renderTabs();
  renderParse();
  renderGenerate();
}

function renderTabs() {
  for (const button of tabButtons) {
    const active = button.dataset.tab === state.activeTab;
    button.dataset.active = String(active);
    button.setAttribute("aria-selected", String(active));
  }

  for (const panel of tabPanels) {
    panel.hidden = panel.dataset.tabPanel !== state.activeTab;
  }
}

function renderParse() {
  const doneCount = state.parse.records.filter((record) => record.status === "done").length;
  const errorCount = state.parse.records.filter((record) => record.status === "error").length;
  totalStat.textContent = String(state.parse.records.length);
  successStat.textContent = String(doneCount);
  failedStat.textContent = String(errorCount);

  startButton.disabled = state.parse.processing || state.parse.records.length === 0;
  startButton.textContent = state.parse.processing ? "변환 중..." : "변환 시작";
  resetButton.disabled = state.parse.processing;
  fileInput.disabled = state.parse.processing;
  dropzone.dataset.locked = state.parse.processing ? "true" : "false";

  downloadAllButton.disabled = state.parse.processing || doneCount === 0;
  downloadAllButton.textContent = !state.parse.processing && doneCount > 0
    ? "모두 ZIP으로 다운로드"
    : state.parse.processing
      ? "변환 완료 후 활성화"
      : "다운로드 준비 전";

  results.innerHTML = state.parse.records.map((record) => {
    const warnings = record.result?.warnings?.length
      ? `<details class="row-details"><summary>경고 ${record.result.warnings.length}건 보기</summary><pre>${escapeHtml(record.result.warnings.map((warning) => warning.message).join("\n"))}</pre></details>`
      : "";

    const action = record.result?.success
      ? `<button class="row-action" data-action="download" data-id="${record.id}">${record.result.images?.length ? "ZIP 다운로드" : "MD 다운로드"}</button>`
      : `<span class="row-action row-action-muted">${record.status === "queued" ? "대기" : "미지원"}</span>`;

    return `
      <article class="result-row result-row-${record.status}">
        <div class="row-main">
          <div class="row-title-wrap">
            <h3 class="row-title">${escapeHtml(record.file.name)}</h3>
            <span class="row-badge row-badge-${record.status}">${statusLabel(record.status)}</span>
          </div>
          <p class="row-meta">${formatSize(record.file.size)} · ${escapeHtml(record.progressText)}</p>
          <p class="row-message">${escapeHtml(record.message)}</p>
          ${warnings}
        </div>
        <div class="row-side">${action}</div>
      </article>
    `;
  }).join("");
}

function renderGenerate() {
  if (markdownInput.value !== state.generate.markdown) {
    markdownInput.value = state.generate.markdown;
  }

  if (outputNameInput.value !== state.generate.outputName) {
    outputNameInput.value = state.generate.outputName;
  }

  if (themePresetSelect.value !== state.generate.themePreset) {
    themePresetSelect.value = state.generate.themePreset;
  }

  const characters = state.generate.markdown.length;
  markdownMeta.textContent = `${state.generate.sourceLabel} · ${characters.toLocaleString()}자 · ${countLines(state.generate.markdown)}줄`;
  generateHint.textContent = state.generate.sourceLabel === "직접 입력"
    ? "Markdown을 직접 붙여넣거나 `.md` 파일을 불러온 뒤 HWPX 문서로 저장할 수 있습니다."
    : `최근 불러온 원본: ${state.generate.sourceLabel}`;

  markdownInput.disabled = state.generate.processing;
  markdownFileInput.disabled = state.generate.processing;
  outputNameInput.disabled = state.generate.processing;
  themePresetSelect.disabled = state.generate.processing;
  sampleMarkdownButton.disabled = state.generate.processing;
  resetMarkdownButton.disabled = state.generate.processing;
  generateButton.disabled = state.generate.processing;
  generateButton.textContent = state.generate.processing ? "HWPX 만드는 중..." : "HWPX 만들기";
  downloadHwpxButton.disabled = state.generate.processing || !state.generate.result;
  downloadHwpxButton.textContent = state.generate.processing
    ? "생성 중..."
    : state.generate.result
      ? "HWPX 다운로드"
      : "다운로드 대기";

  if (state.generate.processing) {
    generateSummary.textContent = "HWPX 패키지를 만드는 중";
  } else if (state.generate.result) {
    generateSummary.textContent = `${currentHwpxFilename()} · ${formatSize(state.generate.result.byteLength)}`;
  } else if (state.generate.error) {
    generateSummary.textContent = "오류 발생";
  } else if (state.generate.markdown.trim()) {
    generateSummary.textContent = `${characters.toLocaleString()}자 입력 준비됨`;
  } else {
    generateSummary.textContent = "입력 대기 중";
  }

  generateResult.innerHTML = renderGenerateCard();
}

function renderGenerateCard() {
  const preset = THEME_PRESETS[state.generate.themePreset] ?? THEME_PRESETS.neutral;

  if (state.generate.processing) {
    return `
      <article class="generator-card generator-card-processing">
        <p class="panel-kicker">생성 중</p>
        <h3>Markdown을 HWPX 패키지로 변환하고 있습니다.</h3>
        <p class="generator-copy">브라우저 안에서 ZIP 패키지와 문단 스타일을 조합하는 중입니다.</p>
      </article>
    `;
  }

  if (state.generate.error) {
    return `
      <article class="generator-card generator-card-error">
        <p class="panel-kicker">생성 실패</p>
        <h3>HWPX를 만들지 못했습니다.</h3>
        <p class="generator-copy">${escapeHtml(state.generate.error)}</p>
      </article>
    `;
  }

  if (state.generate.result) {
    return `
      <article class="generator-card generator-card-done">
        <p class="panel-kicker">생성 완료</p>
        <h3>${escapeHtml(currentHwpxFilename())}</h3>
        <p class="generator-copy">문서 패키지가 준비되었습니다. 상단 다운로드 버튼으로 바로 저장할 수 있습니다.</p>
        <div class="generator-metrics">
          <span class="metric-pill">출력 ${formatSize(state.generate.result.byteLength)}</span>
          <span class="metric-pill">테마 ${escapeHtml(preset.label)}</span>
          <span class="metric-pill">입력 ${state.generate.markdown.length.toLocaleString()}자</span>
        </div>
      </article>
    `;
  }

  return `
    <article class="generator-card generator-card-idle">
      <p class="panel-kicker">준비</p>
      <h3>Markdown을 붙여넣고 HWPX 문서를 생성해 보세요.</h3>
      <p class="generator-copy">헤딩, 목록, 인용문, 코드블록, 표를 포함한 문서를 브라우저 안에서 바로 패키징합니다.</p>
    </article>
  `;
}

function resetParseState() {
  state.parse.processing = false;
  state.parse.records = [];
  fileInput.value = "";
  queueHint.textContent = "HWP 또는 HWPX 파일을 여러 개 올리면 한 번에 변환할 수 있습니다.";
  renderParse();
}

function resetGenerateState() {
  state.generate.error = null;
  state.generate.markdown = "";
  state.generate.outputName = DEFAULT_OUTPUT_NAME;
  state.generate.processing = false;
  state.generate.result = null;
  state.generate.sourceLabel = "직접 입력";
  state.generate.themePreset = "neutral";
  markdownFileInput.value = "";
  renderGenerate();
}

function setGenerateDraft(markdown, {
  clearResult = false,
  outputName = state.generate.outputName,
  sourceLabel = state.generate.sourceLabel,
} = {}) {
  state.generate.markdown = markdown;
  state.generate.outputName = outputName;
  state.generate.sourceLabel = sourceLabel;
  state.generate.error = null;
  if (clearResult) {
    state.generate.result = null;
  }
  renderGenerate();
}

function statusLabel(status) {
  switch (status) {
    case "queued":
      return "대기";
    case "parsing":
      return "변환 중";
    case "done":
      return "완료";
    case "error":
      return "실패";
    default:
      return status;
  }
}

function formatSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function countLines(text) {
  if (!text) {
    return 0;
  }

  return text.split(/\r?\n/).length;
}

function stripExtension(filename) {
  return filename.replace(/\.[^.]+$/, "");
}

function sanitizeFilename(filename) {
  return filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").trim() || "document";
}

function uniqueName(name, usedNames) {
  if (!usedNames.has(name)) {
    usedNames.add(name);
    return name;
  }

  let suffix = 2;
  while (usedNames.has(`${name}-${suffix}`)) {
    suffix += 1;
  }

  const nextName = `${name}-${suffix}`;
  usedNames.add(nextName);
  return nextName;
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

function currentHwpxFilename() {
  const raw = state.generate.outputName.trim() || DEFAULT_OUTPUT_NAME;
  return `${sanitizeFilename(stripExtension(raw))}.hwpx`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function isSupportedParseFile(file) {
  return /\.(hwp|hwpx)$/i.test(file.name);
}

function isSupportedMarkdownFile(file) {
  return /\.(md|markdown|txt)$/i.test(file.name);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

render();
