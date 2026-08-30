/* global caches, self */

// AUTO-MANAGED and permanently bounded to one cache with one small legacy
// migration entry. A navigation served after activation clears it. This remains
// permanent by design because a tablet may stay offline on a pre-handshake
// release indefinitely.
const HANDSHAKE_MARKER_CACHE = "__PWA_MARKER_CACHE__";
const LEGACY_NAVIGATION_REQUEST = new URL("__PWA_LEGACY_NAVIGATION_PATH__", self.registration.scope);
const WORKER_RELEASE_ID = new URL("__PWA_RELEASE_ENTRY__", self.registration.scope).href;
// Browser tabs are the fan-out boundary. At the limit, excess legacy tabs are
// shed and advance on their own next navigation; a family device is expected
// to have one, but the activate event must never grow without a ceiling.
const MAX_LEGACY_CLIENTS_TO_NAVIGATE = 16;

// This imported listener is registered before Workbox's generated listener.
// It owns the shared activation message and leaves the update staged while a
// sibling tab is still using the old release. At limit, activation is blocked;
// another explicit load retries after the sibling closes.
self.addEventListener("message", (event) => {
  if (event.data?.type === "__PWA_RELEASE_REQUEST_TYPE__") {
    event.ports[0]?.postMessage({
      type: "__PWA_RELEASE_RESPONSE_TYPE__",
      releaseId: WORKER_RELEASE_ID,
    });
    return;
  }
  if (event.data?.type !== "__PWA_MESSAGE_TYPE__") return;
  event.stopImmediatePropagation();
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
    const scopedClients = clients.filter((client) => client.url.startsWith(self.registration.scope));
    if (scopedClients.length <= 1) await self.skipWaiting();
  })());
});

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const markerExists = await caches.has(HANDSHAKE_MARKER_CACHE);
    const existingMarker = markerExists
      ? await caches.open(HANDSHAKE_MARKER_CACHE)
      : null;
    const migrationPending = existingMarker
      ? Boolean(await existingMarker.match(LEGACY_NAVIGATION_REQUEST))
      : false;
    const handshakeAlreadySupported = markerExists && !migrationPending;
    if (!self.registration.active) return;

    if (handshakeAlreadySupported) return;

    const marker = existingMarker ?? await caches.open(HANDSHAKE_MARKER_CACHE);
    await marker.put(LEGACY_NAVIGATION_REQUEST, new Response("pending"));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const marker = await caches.open(HANDSHAKE_MARKER_CACHE);
    const legacyNavigation = await marker.match(LEGACY_NAVIGATION_REQUEST);
    if (!legacyNavigation) return;

    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
    const scopedClients = clients
      .filter((client) => client.url.startsWith(self.registration.scope))
      .slice(0, MAX_LEGACY_CLIENTS_TO_NAVIGATE);
    // Do not await navigation from activate: navigation waits for activation,
    // so coupling the promises deadlocks both. Each navigation is non-retriable;
    // rejection waits for the user's next explicit load.
    for (const client of scopedClients) {
      void client.navigate(client.url).catch(() => undefined);
    }
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.waitUntil((async () => {
    if (!await caches.has(HANDSHAKE_MARKER_CACHE)) return;
    const marker = await caches.open(HANDSHAKE_MARKER_CACHE);
    // A navigation handled after activation is the authoritative completion
    // signal. Interrupted legacy activation leaves pending for the next worker.
    await marker.delete(LEGACY_NAVIGATION_REQUEST);
  })());
});
