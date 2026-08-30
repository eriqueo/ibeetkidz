/* global caches, Response, self, URL */

// AUTO-MANAGED and permanently bounded to one cache: `pending` until a current
// navigation runs, then empty. An empty cache says the active release completed
// the migration and understands the explicit-load update handshake. This
// migration is permanent by design: a tablet can remain
// offline on the pre-handshake release indefinitely, so there is no safe date
// after which every installed client can be assumed migrated.
const HANDSHAKE_MARKER_CACHE = "ibeetkidz-pwa-handshake-v1";
const LEGACY_NAVIGATION_REQUEST = new URL("__pwa_legacy_navigation__", self.registration.scope);
// Browser tabs are the fan-out boundary. At the limit, excess legacy tabs are
// shed and advance on their own next navigation; a family device is expected
// to have one, but the activate event must never grow without a ceiling.
const MAX_LEGACY_CLIENTS_TO_NAVIGATE = 16;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.has(HANDSHAKE_MARKER_CACHE).then(async (markerExists) => {
      const existingMarker = markerExists
        ? await caches.open(HANDSHAKE_MARKER_CACHE)
        : null;
      const migrationPending = existingMarker
        ? Boolean(await existingMarker.match(LEGACY_NAVIGATION_REQUEST))
        : false;
      const handshakeAlreadySupported = markerExists && !migrationPending;
      if (handshakeAlreadySupported || !self.registration.active) return;

      const marker = existingMarker ?? await caches.open(HANDSHAKE_MARKER_CACHE);
      await marker.put(LEGACY_NAVIGATION_REQUEST, new Response("pending"));
      await self.skipWaiting();
    }),
  );
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
    // Do not await navigation from the activate event: navigation waits for
    // activation to finish, so coupling the promises would deadlock both. Each
    // navigation is non-retriable; a rejected navigation waits for the user's
    // next explicit load instead of entering a retry loop.
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
    // signal. Interrupted activation leaves `pending` for the next installer.
    await marker.delete(LEGACY_NAVIGATION_REQUEST);
  })());
});
