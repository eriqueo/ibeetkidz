import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import updateProtocol from "../src/pwa-update-protocol.json" with { type: "json" };

const builds = [
  { dir: "dist", base: "/" },
  { dir: "dist-gh", base: "/ibeetkidz/" },
];
const migrationScript = "pwa-handshake-migration.js";
const noticesFile = "THIRD_PARTY_NOTICES.txt";
const expectedNotices = readFileSync(noticesFile, "utf8");
const generatedRuntimePackages = new Set(
  JSON.parse(readFileSync("legal/generated-runtime-packages.json", "utf8")),
);
const declaredWorkboxPackages = new Set(
  [...generatedRuntimePackages].filter((name) => name.startsWith("workbox-")),
);

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

for (const { dir, base } of builds) {
  const html = readFileSync(join(dir, "index.html"), "utf8");
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.webmanifest"), "utf8"));
  const sw = readFileSync(join(dir, "sw.js"), "utf8");
  const deployedNotices = readFileSync(join(dir, noticesFile), "utf8");
  const workerRuntimeNames = readdirSync(dir).filter((name) =>
    /^workbox-[a-f0-9]+\.js$/.test(name),
  );

  if (workerRuntimeNames.length !== 1) {
    throw new Error(`${dir} must contain exactly one generated Workbox runtime`);
  }

  // Workbox deliberately leaves one `workbox:<module>:<version>` marker per
  // emitted module. Compare the built truth to the notice input so a new
  // runtime module cannot ship without its license, and a stale declaration
  // cannot conceal drift.
  const workerRuntime = readFileSync(join(dir, workerRuntimeNames[0]), "utf8");
  const emittedWorkboxPackages = new Set(
    [...workerRuntime.matchAll(/workbox:([a-z-]+):[0-9.]+/g)].map(
      (match) => `workbox-${match[1]}`,
    ),
  );
  const undeclared = [...emittedWorkboxPackages].filter(
    (name) => !declaredWorkboxPackages.has(name),
  );
  const notEmitted = [...declaredWorkboxPackages].filter(
    (name) => !emittedWorkboxPackages.has(name),
  );
  if (undeclared.length > 0 || notEmitted.length > 0) {
    throw new Error(
      `PWA_LEGAL_RUNTIME_MISMATCH: ${dir}; undeclared=${undeclared.join(",") || "none"}; not-emitted=${notEmitted.join(",") || "none"}`,
    );
  }

  if (deployedNotices !== expectedNotices) {
    throw new Error(`${dir}/${noticesFile} is missing or stale`);
  }

  for (const required of ["name", "short_name", "start_url", "scope", "id", "display"]) {
    if (!manifest[required]) throw new Error(`${dir} manifest is missing ${required}`);
  }
  if (manifest.start_url !== "./" || manifest.scope !== "./" || manifest.id !== "./") {
    throw new Error(`${dir} manifest identity and navigation fields must remain base-relative`);
  }
  if (!html.includes(`href="${base}manifest.webmanifest"`)) {
    throw new Error(`${dir}/index.html does not reference its base-scoped manifest`);
  }
  if (html.includes("vite-plugin-pwa:inline-sw")) {
    throw new Error(`${dir}/index.html bypasses the safe composition-root update handshake`);
  }
  if (!sw.includes(updateProtocol.messageType)) {
    throw new Error(`${dir}/sw.js cannot receive the shared update activation message`);
  }
  if (!sw.includes(`importScripts("${migrationScript}")`)) {
    throw new Error(`${dir}/sw.js cannot migrate clients installed before the update handshake`);
  }
  const migrationSource = readFileSync(join(dir, migrationScript), "utf8");
  for (const token of [
    "HANDSHAKE_MARKER_CACHE",
    "WORKER_RELEASE_ID",
    "migrationPending",
    "self.registration.active",
    "skipWaiting",
    "stopImmediatePropagation",
    updateProtocol.releaseRequestType,
    updateProtocol.releaseResponseType,
    "MAX_LEGACY_CLIENTS_TO_NAVIGATE",
    "client.navigate",
    "event.request.mode",
  ]) {
    if (!migrationSource.includes(token)) {
      throw new Error(`${dir}/${migrationScript} is missing migration guard: ${token}`);
    }
  }
  const entryUrls = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((match) => match[1]);
  const entrySource = entryUrls.map((url) => {
    const relativeUrl = url?.startsWith(base) ? url.slice(base.length) : undefined;
    if (!relativeUrl) throw new Error(`${dir}/index.html has an invalid module entry URL: ${url}`);
    return readFileSync(join(dir, relativeUrl), "utf8");
  }).join("\n");
  for (const token of [
    updateProtocol.messageType,
    updateProtocol.controllerChangeEvent,
    updateProtocol.releaseRequestType,
    updateProtocol.releaseResponseType,
  ]) {
    if (!entrySource.includes(token)) {
      throw new Error(`${dir} entry chunk is missing the safe PWA update token: ${token}`);
    }
  }

  for (const icon of manifest.icons ?? []) {
    const iconPath = join(dir, icon.src);
    if (!existsSync(iconPath) || statSync(iconPath).size === 0) {
      throw new Error(`${dir} manifest icon is missing: ${icon.src}`);
    }
  }

  // sw.js itself cannot precache itself. Every other deployed file must be in
  // Workbox's revisioned manifest; this catches newly introduced file types.
  for (const path of filesUnder(dir)) {
    const name = relative(dir, path).split(sep).join("/");
    const isWorkerRuntime = /^workbox-[a-f0-9]+\.js$/.test(name);
    if (name !== "sw.js" && !isWorkerRuntime && !sw.includes(`url:"${name}"`)) {
      throw new Error(`${dir}/${name} is deployed but absent from the offline precache`);
    }
  }
}

console.log("ok: both deploy artifacts are installable and fully precached");
