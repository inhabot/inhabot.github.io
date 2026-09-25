import JSZip from "jszip";
import MarkdownIt from "markdown-it";

const MODE_MARKDOWN_PDF = "markdown-pdf";
const MODE_PDF_MARKDOWN = "pdf-markdown";
const MAX_PDF_BYTES = 40 * 1024 * 1024;
const markdownRenderer = new MarkdownIt({ html: false, linkify: false, breaks: false }).disable("image");

const modes = {
  [MODE_MARKDOWN_PDF]: {
    input: document.querySelector("#markdownPdfInput"),
    hint: "Markdown(.md) 파일을 업로드해주세요. 변환 후 인쇄 창에서 PDF로 저장할 수 있습니다.",
    accept: (file) => /\.(md|markdown|txt)$/i.test(file.name),
    multiple: false,
  },
  [MODE_PDF_MARKDOWN]: {
    input: document.querySelector("#pdfMarkdownInput"),
    hint: "PDF(.pdf) 파일을 업로드해주세요. 텍스트와 표를 Markdown으로 추출합니다.",
    accept: (file) => /\.pdf$/i.test(file.name),
    multiple: true,
  },
};

export function setupPdfModes({ runWorkerJob, downloadBlob, formatSize, sanitizeFilename, stripExtension, escapeHtml, timestamp }) {
  for (const [mode, config] of Object.entries(modes)) {
    const root = document.querySelector(`[data-tab-panel="${mode}"]`);
    const dropzone = root.querySelector(`[data-pdf-dropzone="${mode}"]`);
    const hint = root.querySelector(`[data-pdf-hint="${mode}"]`);
    const start = root.querySelector(`[data-pdf-start="${mode}"]`);
    const reset = root.querySelector(`[data-pdf-reset="${mode}"]`);
    const downloadAll = root.querySelector(`[data-pdf-download-all="${mode}"]`);
    const total = root.querySelector(`[data-pdf-total="${mode}"]`);
    const success = root.querySelector(`[data-pdf-success="${mode}"]`);
    const failed = root.querySelector(`[data-pdf-failed="${mode}"]`);
    const results = root.querySelector(`[data-pdf-results="${mode}"]`);
    const state = { records: [], processing: false };

    function render() {
      const done = state.records.filter((record) => record.status === "done").length;
      const errors = state.records.filter((record) => record.status === "error").length;
      total.textContent = String(state.records.length);
      success.textContent = String(done);
      failed.textContent = String(errors);
      config.input.disabled = state.processing;
      dropzone.dataset.locked = String(state.processing);
      start.disabled = state.processing || state.records.length === 0;
      start.textContent = state.processing ? "변환 중..." : "변환 시작";
      reset.disabled = state.processing;
      if (downloadAll) {
        downloadAll.disabled = state.processing || done === 0;
        downloadAll.textContent = done > 0 ? "모두 ZIP으로 다운로드" : "다운로드 준비 전";
      }

      results.innerHTML = state.records.map((record) => `
        <article class="result-row result-row-${record.status}">
          <div class="row-main">
            <div class="row-title-wrap">
              <h3 class="row-title">${escapeHtml(record.file.name)}</h3>
              <span class="row-badge row-badge-${record.status}">${statusText(record.status)}</span>
            </div>
            <p class="row-meta">${formatSize(record.file.size)} · ${escapeHtml(record.progress)}</p>
            <p class="row-message">${escapeHtml(record.message)}</p>
          </div>
          <div class="row-side">${record.status === "done"
            ? `<button class="row-action" type="button" data-pdf-record="${record.id}">${mode === MODE_MARKDOWN_PDF ? "PDF로 저장" : "MD 다운로드"}</button>`
            : `<span class="row-action row-action-muted">${record.status === "queued" ? "대기" : "미지원"}</span>`}
          </div>
        </article>
      `).join("");
    }

    function setFiles(files) {
      const accepted = Array.from(files).filter(config.accept);
      state.records = (config.multiple ? accepted : accepted.slice(0, 1)).map((file, index) => ({
        id: index + 1,
        file,
        status: "queued",
        progress: "대기 중",
        message: "변환 시작을 누르면 처리합니다.",
      }));
      config.input.value = "";
      hint.textContent = state.records.length
        ? `${state.records.length}개 파일이 준비되었습니다. 변환 시작을 눌러주세요.`
        : config.hint;
      render();
    }

    config.input.addEventListener("change", () => {
      if (!state.processing) setFiles(config.input.files ?? []);
    });
    dropzone.addEventListener("dragover", (event) => {
      if (state.processing) return;
      event.preventDefault();
      dropzone.dataset.dragging = "true";
    });
    dropzone.addEventListener("dragleave", () => { dropzone.dataset.dragging = "false"; });
    dropzone.addEventListener("drop", (event) => {
      if (state.processing) return;
      event.preventDefault();
      dropzone.dataset.dragging = "false";
      setFiles(event.dataTransfer?.files ?? []);
    });

    start.addEventListener("click", async () => {
      if (state.processing || !state.records.length) return;
      state.processing = true;
      render();
      try {
        for (const record of state.records) {
          record.status = "parsing";
          record.progress = "파일 읽는 중";
          record.message = "브라우저에서 변환하고 있습니다.";
          record.markdown = undefined;
          render();
          try {
            if (mode === MODE_MARKDOWN_PDF) {
              const markdown = await record.file.text();
              if (!markdown.trim()) throw new Error("Markdown 파일이 비어 있습니다.");
              record.markdown = markdown;
              record.message = `${markdown.length.toLocaleString()}자 · 인쇄 창에서 PDF로 저장하세요.`;
              record.progress = "PDF 저장 준비 완료";
            } else {
              if (record.file.size > MAX_PDF_BYTES) throw new Error("PDF는 40MB 이하만 변환할 수 있습니다.");
              const buffer = await record.file.arrayBuffer();
              const result = await runWorkerJob("pdf-to-markdown", { buffer }, {
                transfer: [buffer],
                onProgress({ current, total }) {
                  record.progress = `${current}/${total}페이지 처리`;
                  render();
                },
              });
              if (!result.success) throw new Error(result.error);
              if (!result.markdown?.trim()) {
                throw new Error("추출된 텍스트가 없습니다. 이미지 기반 PDF는 OCR이 필요합니다.");
              }
              record.markdown = result.markdown;
              record.message = `${result.markdown.length.toLocaleString()}자 · ${result.metadata?.pageCount ?? 0}페이지${result.warnings?.length ? ` · 경고 ${result.warnings.length}건` : ""}`;
              record.progress = "Markdown 완료";
            }
            record.status = "done";
          } catch (error) {
            record.status = "error";
            record.progress = "오류";
            record.message = error instanceof Error ? error.message : "변환에 실패했습니다.";
          }
          render();
        }
      } finally {
        state.processing = false;
        render();
      }
    });

    reset.addEventListener("click", () => {
      if (state.processing) return;
      state.records = [];
      config.input.value = "";
      hint.textContent = config.hint;
      render();
    });

    results.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-pdf-record]");
      if (!button) return;
      const record = state.records.find((item) => item.id === Number(button.dataset.pdfRecord));
      if (!record?.markdown || record.status !== "done") return;
      if (mode === MODE_MARKDOWN_PDF) {
        printMarkdown(record.markdown, sanitizeFilename(stripExtension(record.file.name)));
      } else {
        downloadBlob(new Blob([record.markdown], { type: "text/markdown;charset=utf-8" }), `${sanitizeFilename(stripExtension(record.file.name))}.md`);
      }
    });

    downloadAll?.addEventListener("click", async () => {
      const completed = state.records.filter((record) => record.status === "done");
      if (!completed.length) return;
      downloadAll.disabled = true;
      downloadAll.textContent = "ZIP 준비 중...";
      try {
        const zip = new JSZip();
        const used = new Set();
        for (const record of completed) {
          const base = sanitizeFilename(stripExtension(record.file.name));
          let filename = `${base}.md`;
          let suffix = 2;
          while (used.has(filename)) filename = `${base}-${suffix++}.md`;
          used.add(filename);
          zip.file(filename, record.markdown);
        }
        downloadBlob(await zip.generateAsync({ type: "blob" }), `pdf-markdown-${timestamp()}.zip`);
      } finally {
        render();
      }
    });

    render();
  }
}

function statusText(status) {
  return { queued: "대기", parsing: "변환 중", done: "완료", error: "실패" }[status] ?? status;
}

function printMarkdown(markdown, filename) {
  const content = markdownRenderer.render(markdown);
  const frame = document.createElement("iframe");
  frame.title = `${filename} PDF 저장`;
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;height:1000px;border:0";
  frame.srcdoc = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${escapePrintText(filename)}</title><style>
    @page{size:A4;margin:20mm}body{font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#171b19;font-size:11pt;line-height:1.6}
    h1,h2,h3{line-height:1.3;break-after:avoid}h1{font-size:21pt}h2{font-size:16pt}h3{font-size:13pt}
    table{width:100%;border-collapse:collapse;margin:1em 0}th,td{border:1px solid #333;padding:5px 8px;text-align:left;vertical-align:top}
    pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f5f5;padding:10px}code{overflow-wrap:anywhere}
    blockquote{border-left:3px solid #888;padding-left:12px;color:#555}a{color:#174c78}p,li,tr{break-inside:avoid}
  </style></head><body>${content}</body></html>`;
  frame.addEventListener("load", () => {
    const printWindow = frame.contentWindow;
    printWindow.addEventListener("afterprint", () => frame.remove(), { once: true });
    printWindow.focus();
    printWindow.print();
    window.setTimeout(() => frame.remove(), 60_000);
  }, { once: true });
  document.body.append(frame);
}

function escapePrintText(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
