import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Dual-base build, mirroring the kidpix pattern:
//   `vite build`            -> dist/      base "/"        (local / release tarball)
//   `vite build --mode gh`  -> dist-gh/   base "/ibeetkidz/" (GitHub Pages)
export default defineConfig(({ mode }) => {
  const isGh = mode === "gh";
  return {
    base: isGh ? "/ibeetkidz/" : "/",
    plugins: [react()],
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
      open: true,
      port: 5173,
    },
  };
});
