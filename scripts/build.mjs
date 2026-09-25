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
  "module": path.resolve("src/shims/module.js"),
  "os": path.resolve("src/shims/os.js"),
  "zlib": path.resolve("src/shims/zlib.js"),
};

const aliasPlugin = {
  name: "browser-builtins",
  setup(pluginBuild) {
    // Formula OCR needs Node-only model downloads; the PDF tab only uses text extraction.
    pluginBuild.onResolve({ filter: /^\.\/formula\/index\.js$/ }, (args) => {
      if (args.importer.endsWith("/pdf/parser.ts")) {
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
await rm(tempOutdir, { force: true, recursive: true });
