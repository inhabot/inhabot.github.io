import { Buffer } from "buffer";

if (!globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

if (!globalThis.process) {
  globalThis.process = {
    browser: true,
    env: {},
    version: "",
    versions: {},
    nextTick: queueMicrotask,
  };
}

export { Buffer };
export const process = globalThis.process;
