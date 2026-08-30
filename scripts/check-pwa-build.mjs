import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import updateProtocol from "../src/pwa-update-protocol.json" with { type: "json" };

const builds = [
  { dir: "dist", base: "/" },
  { dir: "dist-gh", base: "/ibeetkidz/" },
];
const migrationScript = "pwa-handshake-migration.js";

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
    "migrationPending",
    "self.registration.active",
    "skipWaiting",
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
  for (const token of [updateProtocol.messageType, updateProtocol.controllerChangeEvent]) {
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
