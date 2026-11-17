import { cp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const tempOutdir = ".build-assets";
const upstreamPackage = JSON.parse(
  await readFile("vendor/kordoc/package.json", "utf8"),
);

await rm(tempOutdir, { force: true, recursive: true });

const aliases = {
  "child_process": path.resolve("src/shims/child-process.js"),
  "crypto": path.resolve("src/shims/crypto.js"),
  "node:crypto": path.resolve("src/shims/crypto.js"),
  "node:fs/promises": path.resolve("src/shims/node-fs-promises.js"),
  "module": path.resolve("src/shims/module.js"),
  "os": path.resolve("src/shims/os.js"),
  "zlib": path.resolve("src/shims/zlib.js"),
  "node:zlib": path.resolve("src/shims/zlib.js"),
  "stream": path.resolve("node_modules/stream-browserify/index.js"),
  "events": path.resolve("node_modules/events/events.js"),
};

const aliasPlugin = {
  name: "browser-builtins",
  setup(pluginBuild) {
    pluginBuild.onLoad({ filter: /\/hwpx\/parser-shared\.ts$/ }, async (args) => {
      const source = await readFile(args.path, "utf8");
      const nodeStream = 'const stream = file.nodeStream("nodebuffer")';
      if (!source.includes(nodeStream)) throw new Error("kordoc ZIP reader changed; review browser stream adapter");
      return {
        contents: source.replace(nodeStream, 'const stream = file.internalStream("uint8array")\n    queueMicrotask(() => stream.resume())'),
        loader: "ts",
      };
    });
    const optionalModules = {
      "ocr/models.js": "src/shims/ocr-models.js",
      "ocr/options.js": "src/shims/ocr-options.js",
      "ocr/pdf-ocr.js": "src/shims/ocr-pdf.js",
      "qr.js": "src/shims/qr.js",
    };
    pluginBuild.onResolve({ filter: /^(?:\.\.\/)+ocr\/(?:models|options|pdf-ocr)\.js$|^\.\.\/qr\.js$/ }, (args) => {
      if (!args.importer.includes("/vendor/kordoc/src/")) return undefined;
      const target = Object.entries(optionalModules).find(([name]) => args.path.endsWith(name));
      return target ? { path: path.resolve(target[1]) } : undefined;
    });
    // Formula OCR needs Node-only model downloads; the PDF tab only uses text extraction.
    pluginBuild.onResolve({ filter: /^\.\/formula\/index\.js$/ }, (args) => {
      if (args.importer.endsWith("/pdf/parser.ts") || args.importer.endsWith("/pdf/formula-ocr.ts")) {
        return { path: path.resolve("src/shims/pdf-formula.js") };
      }
      return undefined;
    });
    for (const [specifier, replacement] of Object.entries(aliases)) {
      const filter = new RegExp(`^${specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
      pluginBuild.onResolve({ filter }, () => ({ path: replacement }));
    }
  },
};

await build({
  entryPoints: ["src/app.js", "src/worker.js"],
  bundle: true,
  chunkNames: "chunks/[name]-[hash]",
  define: {
    __KORDOC_VERSION__: JSON.stringify(upstreamPackage.version),
    global: "globalThis",
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
  },
  format: "esm",
  inject: ["src/shims/globals.js"],
  minify: true,
  outdir: tempOutdir,
  platform: "browser",
  plugins: [aliasPlugin],
  splitting: true,
  target: ["chrome110", "edge110", "firefox110", "safari16"],
});

await Promise.all([
  rm("assets/app.js", { force: true, recursive: true }),
  rm("assets/worker.js", { force: true, recursive: true }),
  rm("assets/chunks", { force: true, recursive: true }),
]);

await cp(`${tempOutdir}/app.js`, "assets/app.js");
await cp(`${tempOutdir}/worker.js`, "assets/worker.js");
await cp(`${tempOutdir}/chunks`, "assets/chunks", { recursive: true });
await cp("vendor/kordoc/src/pdf/hayro-pdf.wasm", "assets/chunks/hayro-pdf.wasm");
await rm(tempOutdir, { force: true, recursive: true });
