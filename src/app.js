import JSZip from "jszip";
import { KORDOC_VERSION } from "./browser-kordoc.js";

const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });

const state = {
  pending: new Map(),
  processing: false,
  records: [],
};

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
const versionText = document.querySelector("[data-version]");

versionText.textContent = `kordoc ${KORDOC_VERSION}`;

worker.addEventListener("message", (event) => {
  const message = event.data;
  const record = state.records.find((item) => item.id === message.id);

  if (message.type === "progress") {
    if (record) {
      record.progressText = `${message.current}/${message.total} 섹션 처리`;
      record.message = "문서를 분석하고 있습니다.";
      render();
    }
    return;
  }

  const pending = state.pending.get(message.id);
  if (!pending) {
    return;
  }

  state.pending.delete(message.id);

  if (message.type === "error") {
    pending.reject(new Error(message.error));
    return;
  }

  pending.resolve(message.result);
});

dropzone.addEventListener("dragover", (event) => {
  if (state.processing) {
    return;
  }

  event.preventDefault();
  dropzone.dataset.dragging = "true";
});

dropzone.addEventListener("dragleave", () => {
  dropzone.dataset.dragging = "false";
});

dropzone.addEventListener("drop", (event) => {
  if (state.processing) {
    return;
  }

  event.preventDefault();
  dropzone.dataset.dragging = "false";
  const files = Array.from(event.dataTransfer?.files ?? []).filter(isSupportedFile);
  if (files.length > 0) {
    setRecords(files);
  }
});

fileInput.addEventListener("change", () => {
  if (state.processing) {
    return;
  }

  const files = Array.from(fileInput.files ?? []).filter(isSupportedFile);
  setRecords(files);
});

startButton.addEventListener("click", async () => {
  if (state.processing || state.records.length === 0) {
    return;
  }

  await startConversion();
});

resetButton.addEventListener("click", () => {
  resetState();
});

downloadAllButton.addEventListener("click", async () => {
  const succeeded = state.records.filter((record) => record.result?.success);
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
  const record = state.records.find((item) => item.id === id);
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

function setRecords(files) {
  state.records = files.map((file, index) => ({
    file,
    id: index + 1,
    message: "변환을 시작하면 이 파일을 분석합니다.",
    progressText: "대기 중",
    status: "queued",
  }));

  queueHint.textContent = files.length > 0
    ? `${files.length}개 파일이 준비되었습니다. 변환 시작을 누르면 순서대로 Markdown으로 바뀝니다.`
    : "HWP 또는 HWPX 파일을 여러 개 올리면 한 번에 변환할 수 있습니다.";

  render();
}

async function startConversion() {
  state.processing = true;
  render();

  try {
    for (const record of state.records) {
      record.failure = undefined;
      record.message = "브라우저 안에서 안전하게 변환하고 있습니다.";
      record.progressText = "파일 읽는 중";
      record.result = undefined;
      record.status = "parsing";
      render();

      try {
        const buffer = await record.file.arrayBuffer();
        record.progressText = "문서 분석 시작";
        render();

        const result = await parseInWorker(record.id, record.file.name, buffer);
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

      render();
    }
  } finally {
    state.processing = false;
    render();
  }
}

function parseInWorker(id, fileName, buffer) {
  return new Promise((resolve, reject) => {
    state.pending.set(id, { resolve, reject });
    worker.postMessage({ buffer, fileName, id }, [buffer]);
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
  const doneCount = state.records.filter((record) => record.status === "done").length;
  const errorCount = state.records.filter((record) => record.status === "error").length;

  totalStat.textContent = String(state.records.length);
  successStat.textContent = String(doneCount);
  failedStat.textContent = String(errorCount);

  startButton.disabled = state.processing || state.records.length === 0;
  startButton.textContent = state.processing ? "변환 중..." : "변환 시작";
  resetButton.disabled = state.processing;
  fileInput.disabled = state.processing;
  dropzone.dataset.locked = state.processing ? "true" : "false";

  downloadAllButton.disabled = state.processing || doneCount === 0;
  downloadAllButton.textContent = !state.processing && doneCount > 0
    ? "모두 ZIP으로 다운로드"
    : state.processing
      ? "변환 완료 후 활성화"
      : "다운로드 준비 전";

  results.innerHTML = state.records.map((record) => {
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

function resetState() {
  state.pending.clear();
  state.processing = false;
  state.records = [];
  fileInput.value = "";
  queueHint.textContent = "HWP 또는 HWPX 파일을 여러 개 올리면 한 번에 변환할 수 있습니다.";
  render();
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

function isSupportedFile(file) {
  return /\.(hwp|hwpx)$/i.test(file.name);
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
