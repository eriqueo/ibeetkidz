import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import type { OutputChunk } from "rollup";
import type { Plugin } from "vite";
import protocol from "../src/pwa-update-protocol.json";

const templatePath = fileURLToPath(
  new URL("./pwa-handshake-migration.template.js", import.meta.url),
);

function entryChunk(bundle: Record<string, unknown>): OutputChunk {
  const entries = Object.values(bundle).filter(
    (item): item is OutputChunk =>
      typeof item === "object"
      && item !== null
      && "type" in item
      && item.type === "chunk"
      && "isEntry" in item
      && item.isEntry === true,
  );
  if (entries.length !== 1) {
    throw new Error(`PWA release identity requires one entry chunk, found ${entries.length}`);
  }
  return entries[0];
}

/** Emits the classic worker helper with the built entry URL as its release ID. */
export function pwaRuntimeAssets(): Plugin {
  return {
    name: "ibeetkidz-pwa-runtime-assets",
    apply: "build",
    generateBundle(_options, bundle) {
      const releaseEntry = entryChunk(bundle).fileName;
      const source = readFileSync(templatePath, "utf8")
        .replaceAll("__PWA_RELEASE_ENTRY__", releaseEntry)
        .replaceAll("__PWA_MESSAGE_TYPE__", protocol.messageType)
        .replaceAll("__PWA_RELEASE_REQUEST_TYPE__", protocol.releaseRequestType)
        .replaceAll("__PWA_RELEASE_RESPONSE_TYPE__", protocol.releaseResponseType)
        .replaceAll("__PWA_MARKER_CACHE__", protocol.markerCache)
        .replaceAll("__PWA_LEGACY_NAVIGATION_PATH__", protocol.legacyNavigationPath);
      if (/__PWA_[A-Z_]+__/.test(source)) {
        throw new Error("PWA runtime asset contains an unresolved protocol placeholder");
      }
      this.emitFile({
        type: "asset",
        fileName: "pwa-handshake-migration.js",
        source,
      });
    },
  };
}
