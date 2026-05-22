import { copyFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const UPSTREAM_NAME = "upstream";
const UPSTREAM_URL = "https://github.com/chrisryugj/kordoc.git";
const UPSTREAM_REF = `${UPSTREAM_NAME}/main`;
const VENDOR_DIR = path.join(ROOT, "vendor", "kordoc");
const VENDOR_ARCHIVE_ITEMS = ["src", "package.json", "LICENSE", "NOTICE", "README.md"];
const LOCAL_BROWSER_DEPENDENCIES = {
  buffer: "^6.0.3",
  pako: "^2.1.0",
};
const LOCAL_DEV_DEPENDENCIES = {
  esbuild: "^0.25.5",
};

ensureUpstreamRemote();

log("Fetching latest upstream changes...");
run("git", ["fetch", UPSTREAM_NAME]);

const upstreamCommit = run("git", ["rev-parse", UPSTREAM_REF]).trim();
const upstreamSummary = run("git", ["log", "-1", "--format=%ad %h %s", "--date=short", UPSTREAM_REF]).trim();

log("Refreshing vendored kordoc source...");
await refreshVendorTree();

log("Syncing package dependencies for the browser build...");
await syncRootPackageJson();

log("Syncing root LICENSE and NOTICE...");
await copyFile(path.join(VENDOR_DIR, "LICENSE"), path.join(ROOT, "LICENSE"));
await copyFile(path.join(VENDOR_DIR, "NOTICE"), path.join(ROOT, "NOTICE"));

log("Installing dependencies...");
run("npm", ["install"], { stdio: "inherit" });

log("Rebuilding static assets...");
run("npm", ["run", "build"], { stdio: "inherit" });

log(`Done. Upstream is now at ${upstreamSummary}`);
log(`Vendored commit: ${upstreamCommit}`);

function ensureUpstreamRemote() {
  try {
    const url = run("git", ["remote", "get-url", UPSTREAM_NAME]).trim();
    if (url !== UPSTREAM_URL) {
      throw new Error(`Remote '${UPSTREAM_NAME}' points to ${url}, expected ${UPSTREAM_URL}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes(`No such remote '${UPSTREAM_NAME}'`)) {
      throw error;
    }
    log(`Adding missing '${UPSTREAM_NAME}' remote...`);
    run("git", ["remote", "add", UPSTREAM_NAME, UPSTREAM_URL]);
  }
}

async function refreshVendorTree() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "inhabot-kordoc-"));
  try {
    const archivePath = path.join(tempDir, "kordoc.tar");
    run("git", ["archive", "--output", archivePath, UPSTREAM_REF, ...VENDOR_ARCHIVE_ITEMS]);
    await rm(VENDOR_DIR, { force: true, recursive: true });
    run("tar", ["-xf", archivePath, "-C", tempDir]);
    await mkdir(VENDOR_DIR, { recursive: true });

    for (const item of VENDOR_ARCHIVE_ITEMS) {
      await cp(path.join(tempDir, item), path.join(VENDOR_DIR, item), { recursive: true });
    }
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}

async function syncRootPackageJson() {
  const rootPackagePath = path.join(ROOT, "package.json");
  const vendorPackagePath = path.join(VENDOR_DIR, "package.json");
  const rootPackage = JSON.parse(await readFile(rootPackagePath, "utf8"));
  const vendorPackage = JSON.parse(await readFile(vendorPackagePath, "utf8"));

  rootPackage.dependencies = {
    ...rootPackage.dependencies,
    ...vendorPackage.dependencies,
    ...LOCAL_BROWSER_DEPENDENCIES,
  };

  rootPackage.devDependencies = {
    ...rootPackage.devDependencies,
    ...LOCAL_DEV_DEPENDENCIES,
  };

  await writeFile(rootPackagePath, `${JSON.stringify(rootPackage, null, 2)}\n`);
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  });
}

function log(message) {
  console.log(`[update-upstream] ${message}`);
}
