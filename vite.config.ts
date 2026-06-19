import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// Dual-base build, mirroring the kidpix pattern:
//   `vite build`            -> dist/      base "/"        (local / release tarball)
//   `vite build --mode gh`  -> dist-gh/   base "/ibeetkidz/" (GitHub Pages)
export default defineConfig(({ mode }) => {
  const isGh = mode === "gh";
  return {
    base: isGh ? "/ibeetkidz/" : "/",
    build: {
      outDir: isGh ? "dist-gh" : "dist",
      emptyOutDir: true,
      target: "es2022",
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
