import { generateHwpxFromMarkdown, parseDocument } from "./browser-kordoc.js";

self.onmessage = async (event) => {
  const { action, id, payload } = event.data;

  try {
    switch (action) {
      case "parse-document":
        await handleParse(id, payload);
        break;
      case "markdown-to-hwpx":
        await handleGenerate(id, payload);
        break;
      default:
        throw new Error(`지원하지 않는 작업입니다: ${action}`);
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      id,
      error: error instanceof Error
        ? error.message
        : "작업 처리 중 알 수 없는 오류가 발생했습니다.",
    });
  }
};

async function handleParse(id, payload) {
  const { buffer, fileName } = payload;
  const result = await parseDocument(buffer, {
    onProgress(current, total) {
      self.postMessage({
        type: "progress",
        id,
        fileName,
        current,
        total,
      });
    },
  });

  self.postMessage({
    type: "result",
    id,
    result,
  });
}

async function handleGenerate(id, payload) {
  const result = await generateHwpxFromMarkdown(payload.markdown, payload.options);

  if (result.success) {
    self.postMessage(
      {
        type: "result",
        id,
        result,
      },
      [result.buffer],
    );
    return;
  }

  self.postMessage({
    type: "result",
    id,
    result,
  });
}
