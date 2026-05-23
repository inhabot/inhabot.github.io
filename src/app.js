import JSZip from "jszip";
import { KORDOC_VERSION } from "./browser-kordoc.js";

const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
const TAB_PARSE = "parse";
const TAB_GENERATE = "generate";
const DEFAULT_HWPX_OPTIONS = Object.freeze({});
const TAB_COPY = {
  [TAB_PARSE]: {
    description: "한글(.hwp, .hwpx) 파일을 업로드해주세요. 여러 파일을 한 번에 Markdown으로 변환할 수 있습니다.",
    queueHint: "한글(.hwp, .hwpx) 파일을 업로드해주세요. 여러 파일을 한 번에 Markdown으로 바꿀 수 있습니다.",
  },
  [TAB_GENERATE]: {
    description: "Markdown(.md) 파일을 업로드해주세요. 붙여넣은 텍스트도 바로 HWPX로 저장할 수 있습니다.",
    queueHint: "Markdown(.md) 파일을 업로드해주세요. 직접 붙여넣은 텍스트도 바로 HWPX로 저장할 수 있습니다.",
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
    processing: false,
    records: [],
  },
};

const tabButtons = Array.from(document.querySelectorAll("[data-tab-button]"));
const tabPanels = Array.from(document.querySelectorAll("[data-tab-panel]"));
const tabDescription = document.querySelector("[data-tab-description]");
const dropzone = document.querySelector("[data-dropzone]");
const generateDropzone = document.querySelector("[data-generate-dropzone]");
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
const markdownFileInput = document.querySelector("#markdownFileInput");
const generateStartButton = document.querySelector("#generateStartButton");
const generateDownloadAllButton = document.querySelector("#generateDownloadAllButton");
const generateResetButton = document.querySelector("#generateResetButton");
const generateQueueHint = document.querySelector("[data-generate-queue-hint]");
const generateTotalStat = document.querySelector("[data-generate-stat-total]");
const generateSuccessStat = document.querySelector("[data-generate-stat-success]");
const generateFailedStat = document.querySelector("[data-generate-stat-failed]");
const generateSummary = document.querySelector("[data-generate-summary]");
const generateResults = document.querySelector("[data-generate-results]");

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

generateResults.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement) || target.dataset.action !== "download-generate") {
    return;
  }

  const id = Number(target.dataset.id);
  const record = state.generate.records.find((item) => item.id === id);
  if (!record?.result?.success) {
    return;
  }

  const blob = new Blob([record.result.buffer], { type: "application/hwp+zip" });
  downloadBlob(blob, record.result.filename);
});

markdownFileInput.addEventListener("change", () => {
  if (state.generate.processing) {
    return;
  }

  const files = Array.from(markdownFileInput.files ?? []).filter(isSupportedMarkdownFile);
  setGenerateRecords(files);
});

generateStartButton.addEventListener("click", async () => {
  if (state.generate.processing || state.generate.records.length === 0) {
    return;
  }

  await startHwpxGeneration();
});

generateResetButton.addEventListener("click", () => {
  resetGenerateState();
});

generateDownloadAllButton.addEventListener("click", async () => {
  const succeeded = state.generate.records.filter((record) => record.result?.success);
  if (succeeded.length === 0) {
    return;
  }

  generateDownloadAllButton.disabled = true;
  generateDownloadAllButton.textContent = "ZIP 준비 중...";

  try {
    const zip = new JSZip();
    const usedNames = new Set();

    for (const record of succeeded) {
      zip.file(
        uniqueName(record.result.filename, usedNames),
        record.result.buffer,
      );
    }

    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, `kordoc-hwpx-${timestamp()}.zip`);
  } finally {
    generateDownloadAllButton.disabled = false;
    generateDownloadAllButton.textContent = "모두 ZIP으로 다운로드";
  }
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
    : TAB_COPY[TAB_PARSE].queueHint;

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

function setGenerateRecords(files) {
  state.generate.records = files.map((file, index) => ({
    file,
    id: index + 1,
    message: "변환을 시작하면 이 파일을 HWPX로 생성합니다.",
    progressText: "대기 중",
    status: "queued",
  }));

  markdownFileInput.value = "";
  generateQueueHint.textContent = files.length > 0
    ? `${files.length}개 파일이 준비되었습니다. 변환 시작을 누르면 순서대로 HWPX로 바뀝니다.`
    : "Markdown(.md) 파일을 업로드해주세요. 여러 파일을 한 번에 HWPX로 바꿀 수 있습니다.";

  renderGenerate();
}

async function startHwpxGeneration() {
  if (state.generate.processing) {
    return;
  }

  if (state.generate.records.length === 0) {
    renderGenerate();
    return;
  }

  state.generate.processing = true;
  renderGenerate();

  try {
    for (const record of state.generate.records) {
      record.message = "브라우저 안에서 안전하게 HWPX를 생성하고 있습니다.";
      record.progressText = "Markdown 읽는 중";
      record.result = undefined;
      record.status = "parsing";
      renderGenerate();

      try {
        const markdown = await record.file.text();
        record.progressText = "HWPX 생성 시작";
        renderGenerate();

        const result = await runWorkerJob("markdown-to-hwpx", {
          markdown,
          options: DEFAULT_HWPX_OPTIONS,
        });

        if (result.success) {
          record.status = "done";
          record.result = {
            success: true,
            buffer: result.buffer,
            byteLength: result.byteLength,
            filename: `${sanitizeFilename(stripExtension(record.file.name))}.hwpx`,
          };
          record.message = `${countLines(markdown)}줄 · ${formatSize(result.byteLength)}`;
          record.progressText = "HWPX 완료";
        } else {
          record.status = "error";
          record.message = result.error;
          record.progressText = result.code ?? "오류";
        }
      } catch (error) {
        record.status = "error";
        record.message = error instanceof Error ? error.message : "HWPX 생성 실패";
        record.progressText = "오류";
      }

      renderGenerate();
    }
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
  document.body.dataset.mode = state.activeTab;

  for (const button of tabButtons) {
    const active = button.dataset.tab === state.activeTab;
    button.dataset.active = String(active);
    button.setAttribute("aria-selected", String(active));
  }

  for (const panel of tabPanels) {
    panel.hidden = panel.dataset.tabPanel !== state.activeTab;
  }

  tabDescription.textContent = TAB_COPY[state.activeTab]?.description ?? TAB_COPY[TAB_PARSE].description;
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
  const doneCount = state.generate.records.filter((record) => record.status === "done").length;
  const errorCount = state.generate.records.filter((record) => record.status === "error").length;
  generateTotalStat.textContent = String(state.generate.records.length);
  generateSuccessStat.textContent = String(doneCount);
  generateFailedStat.textContent = String(errorCount);

  generateDropzone.dataset.locked = state.generate.processing ? "true" : "false";
  markdownFileInput.disabled = state.generate.processing;
  generateStartButton.disabled = state.generate.processing || state.generate.records.length === 0;
  generateStartButton.textContent = state.generate.processing ? "변환 중..." : "변환 시작";
  generateResetButton.disabled = state.generate.processing;
  generateDownloadAllButton.disabled = state.generate.processing || doneCount === 0;
  generateDownloadAllButton.textContent = !state.generate.processing && doneCount > 0
    ? "모두 ZIP으로 다운로드"
    : state.generate.processing
      ? "변환 완료 후 활성화"
      : "다운로드 준비 전";

  if (state.generate.processing) {
    generateSummary.textContent = "HWPX 패키지를 만드는 중";
  } else if (doneCount > 0) {
    generateSummary.textContent = `${doneCount}개 HWPX 준비됨`;
  } else if (errorCount > 0) {
    generateSummary.textContent = "오류 발생";
  } else {
    generateSummary.textContent = "업로드 대기 중";
  }

  generateResults.innerHTML = state.generate.records.map((record) => {
    const action = record.result?.success
      ? `<button class="row-action" data-action="download-generate" data-id="${record.id}">HWPX 다운로드</button>`
      : `<span class="row-action row-action-muted">${record.status === "queued" ? "대기" : "미지원"}</span>`;

    return `
      <article class="result-row result-row-${record.status}">
        <div class="row-main">
          <div class="row-title-wrap">
            <h3 class="row-title">${escapeHtml(record.file.name)}</h3>
            <span class="row-badge row-badge-${record.status}">${generateStatusLabel(record.status)}</span>
          </div>
          <p class="row-meta">${formatSize(record.file.size)} · ${escapeHtml(record.progressText)}</p>
          <p class="row-message">${escapeHtml(record.message)}</p>
        </div>
        <div class="row-side">${action}</div>
      </article>
    `;
  }).join("");
}

function resetParseState() {
  state.parse.processing = false;
  state.parse.records = [];
  fileInput.value = "";
  queueHint.textContent = TAB_COPY[TAB_PARSE].queueHint;
  renderParse();
}

function resetGenerateState() {
  state.generate.processing = false;
  state.generate.records = [];
  markdownFileInput.value = "";
  generateQueueHint.textContent = "Markdown(.md) 파일을 업로드해주세요. 여러 파일을 한 번에 HWPX로 바꿀 수 있습니다.";
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

function generateStatusLabel(status) {
  switch (status) {
    case "queued":
      return "대기";
    case "parsing":
      return "생성 중";
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

generateDropzone.addEventListener("dragover", (event) => {
  if (state.generate.processing) {
    return;
  }

  event.preventDefault();
  generateDropzone.dataset.dragging = "true";
});

generateDropzone.addEventListener("dragleave", () => {
  generateDropzone.dataset.dragging = "false";
});

generateDropzone.addEventListener("drop", (event) => {
  if (state.generate.processing) {
    return;
  }

  event.preventDefault();
  generateDropzone.dataset.dragging = "false";
  const files = Array.from(event.dataTransfer?.files ?? []).filter(isSupportedMarkdownFile);
  if (files.length === 0) {
    return;
  }
  setGenerateRecords(files);
});

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
