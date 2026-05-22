import { detectFormat, detectOle2Format, detectZipFormat } from "../vendor/kordoc/src/detect.ts";
import { parseHwp3Document } from "../vendor/kordoc/src/hwp3/parser.ts";
import { parseHwp5Document } from "../vendor/kordoc/src/hwp5/parser.ts";
import { parseHwpmlDocument } from "../vendor/kordoc/src/hwpml/parser.ts";
import { parseHwpxDocument } from "../vendor/kordoc/src/hwpx/parser.ts";
import { VERSION as KORDOC_VERSION, classifyError } from "../vendor/kordoc/src/utils.ts";

export { KORDOC_VERSION };

export async function parseDocument(buffer, options) {
  if (!buffer || buffer.byteLength === 0) {
    return {
      success: false,
      fileType: "unknown",
      error: "빈 파일이거나 읽을 수 없는 입력입니다.",
      code: "EMPTY_INPUT",
    };
  }

  const format = detectFormat(buffer);
  switch (format) {
    case "hwpx": {
      const zipFormat = await detectZipFormat(buffer);
      if (zipFormat !== "hwpx") {
        return unsupportedFormat();
      }
      return parseHwpx(buffer, options);
    }
    case "hwp": {
      const oleFormat = detectOle2Format(buffer);
      if (oleFormat !== "hwp") {
        return unsupportedFormat();
      }
      return parseHwp(buffer, options);
    }
    case "hwp3":
      return parseHwp3(buffer, options);
    case "hwpml":
      return parseHwpml(buffer, options);
    default:
      return unsupportedFormat();
  }
}

async function parseHwpx(buffer, options) {
  try {
    const result = await parseHwpxDocument(buffer, options);
    return toSuccess("hwpx", result);
  } catch (error) {
    return toFailure("hwpx", error, "HWPX 파싱 실패");
  }
}

async function parseHwp(buffer, options) {
  try {
    const result = parseHwp5Document(Buffer.from(buffer), options);
    return toSuccess("hwp", result);
  } catch (error) {
    return toFailure("hwp", error, "HWP 파싱 실패");
  }
}

async function parseHwp3(buffer, options) {
  try {
    const result = parseHwp3Document(buffer, options);
    return toSuccess("hwp3", result);
  } catch (error) {
    return toFailure("hwp3", error, "HWP3 파싱 실패");
  }
}

async function parseHwpml(buffer, options) {
  try {
    const result = parseHwpmlDocument(buffer, options);
    return toSuccess("hwpml", result);
  } catch (error) {
    return toFailure("hwpml", error, "HWPML 파싱 실패");
  }
}

function toSuccess(fileType, result) {
  return {
    success: true,
    fileType,
    markdown: result.markdown,
    blocks: result.blocks,
    metadata: result.metadata,
    outline: result.outline,
    warnings: result.warnings,
    images: result.images?.length ? result.images : undefined,
    pageCount: result.metadata?.pageCount,
  };
}

function toFailure(fileType, error, fallbackMessage) {
  return {
    success: false,
    fileType,
    error: error instanceof Error ? error.message : fallbackMessage,
    code: classifyError(error),
  };
}

function unsupportedFormat() {
  return {
    success: false,
    fileType: "unknown",
    error: "이 페이지는 HWP와 HWPX만 지원합니다.",
    code: "UNSUPPORTED_FORMAT",
  };
}
