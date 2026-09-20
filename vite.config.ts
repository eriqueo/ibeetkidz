import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";
import { ibkMapWriter } from "./vite-plugins/ibk-map-writer.ts";
import { pwaRuntimeAssets } from "./vite-plugins/pwa-runtime-assets.ts";

// Dual-base build, mirroring the kidpix pattern:
//   `vite build`            -> dist/      base "/"        (local / release tarball)
//   `vite build --mode gh`  -> dist-gh/   base "/ibeetkidz/" (GitHub Pages)
export default defineConfig(({ mode }) => {
  const isGh = mode === "gh";
  return {
    base: isGh ? "/ibeetkidz/" : "/",
    // `ibkMapWriter` is `apply: "serve"` and additionally gated on IBK_EDIT=1,
    // so it is absent from every build and inert in an ordinary `npm run dev`.
    plugins: [
      react(),
      ibkMapWriter(),
      pwaRuntimeAssets(),
      VitePWA({
        // A generated manifest keeps the service worker's revision list tied to
        // the bytes Vite actually emitted. There is deliberately no runtime
        // network cache: every dependency the game needs ships with the app.
        strategies: "generateSW",
        // Registration belongs to the application composition root so an
        // already-waiting release can be activated at an explicit load boundary.
        injectRegister: false,
        manifest: {
          id: "./",
          name: "iBeetKidz",
          short_name: "iBeetKidz",
          description: "A kid-friendly sound playground for making and riding songs.",
          start_url: "./",
          scope: "./",
          display: "standalone",
          orientation: "landscape",
          background_color: "#1a1430",
          theme_color: "#1a1430",
          categories: ["education", "games", "music"],
          icons: [
            { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
            { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            {
              src: "maskable-icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          // Legacy releases only emitted Workbox's inline registration and
          // cannot message the first waiting handshake-capable worker. This
          // imported script performs that migration once, then leaves every
          // later release on the explicit-load handshake.
          importScripts: ["pwa-handshake-migration.js"],
          // Full-color, lossless UI atlas pages reach 14.34 MiB. Keep them in
          // the offline install; check:pwa rejects missing runtime assets.
          maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
          // Only a URL that carries Vite's content hash may skip a revision.
          // The plugin's default exempts EVERYTHING under `assets/`, but the
          // atlases in `assets/spritesheets/` keep fixed names — so an installed
          // app kept its first copy of `ui-atlas-*.png` forever, and a release
          // that repacked the atlas ran new code against the old pages (every
          // control fell back to a flat rectangle). `check:pwa` enforces this.
          dontCacheBustURLsMatching: /-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/,
          // The plugin adds manifest.webmanifest itself; including it here
          // would create two revisions for one URL and invalidate the worker.
          globPatterns: ["**/*.{html,js,css,png,jpg,jpeg,webp,svg,ico,json,txt,woff,woff2,ttf,wav,mp3}"],
        },
      }),
    ],
    build: {
      outDir: isGh ? "dist-gh" : "dist",
      emptyOutDir: true,
      target: "es2022",
      // Phaser is a ~1.7MB engine in its own cacheable vendor chunk; raise the
      // warning ceiling above it so the intentional split doesn't trip CI.
      chunkSizeWarningLimit: 1800,
      // Split the large vendors (Phaser ~1.7MB, Tone.js ~400KB, React ~150KB)
      // into their own chunks so the app chunk stays small and browsers can
      // cache vendor code independently of app changes.
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-tone": ["tone"],
            "vendor-react": ["react", "react-dom"],
            "vendor-phaser": ["phaser"],
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      open: false,
      port: 5173,
      allowedHosts: true,
    },
  };
});
