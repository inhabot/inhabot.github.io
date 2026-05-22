import { parseDocument } from "./browser-kordoc.js";

self.onmessage = async (event) => {
  const { id, fileName, buffer } = event.data;

  try {
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
      fileName,
      result,
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      id,
      fileName,
      error: error instanceof Error
        ? error.message
        : "문서 변환 중 알 수 없는 오류가 발생했습니다.",
    });
  }
};
