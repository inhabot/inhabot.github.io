import { Buffer } from "buffer";

if (!globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

if (!globalThis.process) {
  globalThis.process = { env: {} };
}

export { Buffer };
export const process = globalThis.process;
