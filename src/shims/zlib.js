import pako from "pako";
import { Buffer } from "buffer";

function enforceMaxLength(output, options) {
  const maxOutputLength = options?.maxOutputLength;
  if (typeof maxOutputLength === "number" && output.length > maxOutputLength) {
    throw new Error("압축 해제 크기 초과");
  }
  return Buffer.from(output);
}

export function inflateRawSync(input, options) {
  return enforceMaxLength(pako.inflateRaw(input), options);
}

export function inflateSync(input, options) {
  return enforceMaxLength(pako.inflate(input), options);
}
