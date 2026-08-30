import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import serverProtocol from "../tests/fixtures/pwa-update-server.json" with { type: "json" };

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}
const port = Number(args.get("--port"));
const distDir = args.get("--dist");
const oldDistDir = args.get("--old-dist");
if (!Number.isInteger(port) || !distDir) {
  throw new Error(
    "usage: serve-pwa-update-fixture.mjs --port <port> --dist <dist-gh> [--old-dist <old-dist-gh>]",
  );
}

const base = "/ibeetkidz/";
const builtIndex = readFileSync(join(distDir, "index.html"), "utf8");
const currentWorker = readFileSync(join(distDir, "sw.js"), "utf8");
const legacyEntryName = "fixture-old-entry.js";
const nextEntryName = "assets/fixture-next-entry.js";
const currentEntryUrl = builtIndex.match(/<script[^>]+src="([^"]+\.js)"/)?.[1];
if (!currentEntryUrl?.startsWith(base)) {
  throw new Error("fixture could not find the Pages entry module");
}
const currentEntryName = currentEntryUrl.slice(base.length);
const nextEntryUrl = `${base}${nextEntryName}`;
const nextEntry = `${readFileSync(join(distDir, currentEntryName), "utf8")}\n/* fixture-next-entry */\n`;
const currentIndex = builtIndex;
const migrationScriptName = "pwa-handshake-migration.js";
const currentMigration = readFileSync(join(distDir, migrationScriptName), "utf8");
const nextMigration = currentMigration.replaceAll(currentEntryName, nextEntryName);
if (nextMigration === currentMigration) {
  throw new Error("fixture could not assign the next entry identity to its worker helper");
}
const legacyEntry = `document.getElementById("root").innerHTML = '<button type="button">Tap to Start</button>';
if ("serviceWorker" in navigator) {
  const worker = new URL("sw.js", import.meta.url);
  void navigator.serviceWorker.register(worker, { scope: new URL("./", worker).pathname });
}
`;
const addOldMarker = (index) => index.replace(
  "</head>",
  `<meta name="${serverProtocol.oldReleaseMeta}" content="old"></head>`,
);
const syntheticOldIndex = addOldMarker(builtIndex).replace(
  /(<script[^>]+src=")[^"]+("[^>]*><\/script>)/,
  `$1${base}${legacyEntryName}$2`,
);
const workerWithoutMigration = currentWorker.replace(
  /importScripts\("pwa-handshake-migration\.js"\)[;,]?/,
  "",
);
const syntheticOldWorker = `${workerWithoutMigration
  .replace(
    "[{url:\"index.html\"",
    `[{url:"${legacyEntryName}",revision:"fixture-old-entry"},{url:"index.html"`,
  )
  .replace(/(url:"index\.html",revision:")[^"]+/, "$1fixture-old-release")}\n`;
const oldIndex = oldDistDir
  ? addOldMarker(readFileSync(join(oldDistDir, "index.html"), "utf8"))
  : syntheticOldIndex;
const oldWorker = oldDistDir
  ? readFileSync(join(oldDistDir, "sw.js"), "utf8")
  : syntheticOldWorker;
const nextIndex = currentIndex.replace(
  "</head>",
  `<meta name="${serverProtocol.nextReleaseMeta}" content="next"></head>`,
).replace(currentEntryUrl, nextEntryUrl);
const nextWorkerWithRevision = currentWorker.replace(
  /(url:"index\.html",revision:")[^"]+/,
  "$1fixture-next-release",
).replaceAll(currentEntryName, nextEntryName);
if (!nextWorkerWithRevision.includes(nextEntryName)) {
  throw new Error("fixture could not assign a distinct next-release entry identity");
}
const staleNavigationHarness = `
const fixtureNavigationCache = "ibk-pwa-fixture-navigation-v1";
const fixtureNavigationRequest = new Request(new URL("__consumed_stale_navigation__", self.registration.scope));
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.mode !== "navigate" || !url.searchParams.has(${JSON.stringify(serverProtocol.staleNavigationQuery)})) return;
  event.stopImmediatePropagation();
  event.respondWith((async () => {
    const cache = await caches.open(fixtureNavigationCache);
    if (!await cache.match(fixtureNavigationRequest)) {
      await cache.put(fixtureNavigationRequest, new Response("consumed"));
      return fetch(${JSON.stringify(serverProtocol.staleNavigationPath)});
    }
    return fetch(event.request);
  })());
});
`;
const nextWorker = `${staleNavigationHarness}${nextWorkerWithRevision}\n/* fixture-next-release */\n`;
let release = "old";

const contentTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".ico": "image/x-icon",
  ".js": "text/javascript",
  ".json": "application/json",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".wav": "audio/wav",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function send(response, status, body, type = "text/plain") {
  response.writeHead(status, { "cache-control": "no-cache", "content-type": type });
  response.end(body);
}

createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname === serverProtocol.switchPath) {
    release = "current";
    send(response, 200, "current");
    return;
  }
  if (url.pathname === serverProtocol.nextPath) {
    release = "next";
    send(response, 200, "next");
    return;
  }
  if (url.pathname === serverProtocol.staleNavigationPath) {
    send(response, 200, currentIndex, "text/html");
    return;
  }
  if (!url.pathname.startsWith(base)) {
    send(response, 404, "outside fixture scope");
    return;
  }

  const relative = decodeURIComponent(url.pathname.slice(base.length)) || "index.html";
  if (relative === "index.html") {
    const index = release === "old" ? oldIndex : release === "next" ? nextIndex : currentIndex;
    send(response, 200, index, "text/html");
    return;
  }
  if (relative === "sw.js") {
    const worker = release === "old" ? oldWorker : release === "next" ? nextWorker : currentWorker;
    send(response, 200, worker, "text/javascript");
    return;
  }
  if (release === "next" && relative === migrationScriptName) {
    send(response, 200, nextMigration, "text/javascript");
    return;
  }
  if (!oldDistDir && release === "old" && relative === legacyEntryName) {
    send(response, 200, legacyEntry, "text/javascript");
    return;
  }
  if (release === "next" && relative === nextEntryName) {
    send(response, 200, nextEntry, "text/javascript");
    return;
  }

  const releaseDir = release === "old" && oldDistDir ? oldDistDir : distDir;
  const path = normalize(join(releaseDir, relative));
  if (!path.startsWith(`${normalize(releaseDir)}/`)) {
    send(response, 404, "invalid fixture path");
    return;
  }
  try {
    if (!statSync(path).isFile()) throw new Error("not a file");
    send(response, 200, readFileSync(path), contentTypes[extname(path)] ?? "application/octet-stream");
  } catch {
    send(response, 404, "fixture file missing");
  }
}).listen(port, "127.0.0.1", () => {
  process.stdout.write(`PWA update fixture listening on ${port}\n`);
});
